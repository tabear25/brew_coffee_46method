import {
  conditionLabel,
  isStateCondition,
  resolveSteps,
  withControlDefaults,
  type ControlValues,
  type DerivedValue,
  type Recipe,
  type RecipeStep,
} from "./recipe.types";
import { buildTimeline, lastActiveEndSec, type StepTiming } from "./timeline-builder";
import {
  DEFAULT_SETTINGS,
  EMPTY_ARRANGEMENT,
  type Arrangement,
  type ComputedRecipe,
  type ComputedStep,
  type RecipeMode,
  type RecipeWarning,
} from "./brew.types";

/** 丸め。step = 1 なら 1g 単位、0.5 なら 0.5g 単位 */
export function roundTo(value: number, step: number): number {
  if (!Number.isFinite(value)) return 0;
  if (step <= 0) return value;
  // 0.5 刻みなどで浮動小数の端数が残らないようにする
  return Number((Math.round(value / step) * step).toFixed(6));
}

/** コントロールの選択肢が指定する比率上書きを探す */
function controlRatioOverride(recipe: Recipe, controls: ControlValues): number | undefined {
  for (const control of recipe.flavorControls ?? []) {
    if (control.affects !== "ratio" || !control.options) continue;
    const selected = control.options.find((o) => o.value === controls[control.id]);
    if (selected?.ratioOverride !== undefined) return selected.ratioOverride;
  }
  return undefined;
}

/** 実効比率（豆1 : 湯）。アレンジ > コントロール > 原法 の順で優先する */
export function resolveRatio(
  recipe: Recipe,
  controls: ControlValues,
  arrangement: Arrangement,
): number | undefined {
  return arrangement.ratio ?? controlRatioOverride(recipe, controls) ?? recipe.reference.ratio;
}

/**
 * 総湯量。
 *   比率型:     totalWaterG = roundTo(doseG * ratio, roundingG)
 *   固定湯量型: totalWaterG = reference.waterG（豆量を変えても不変）
 * 固定湯量型でもアレンジで比率を指定した場合は比率型として扱う（＝原法の派生）。
 */
export function computeTotalWater(
  recipe: Recipe,
  doseG: number,
  controls: ControlValues = {},
  arrangement: Arrangement = EMPTY_ARRANGEMENT,
): number {
  const { roundingG } = recipe.scaling;
  if (recipe.scaling.water === "fixed_water" && arrangement.ratio === undefined) {
    return roundTo(recipe.reference.waterG, roundingG);
  }
  const ratio = resolveRatio(recipe, controls, arrangement);
  if (ratio === undefined) return roundTo(recipe.reference.waterG, roundingG);
  return roundTo(doseG * ratio, roundingG);
}

/**
 * 各ステップの「累計目標湯量」。
 * 追加量を個別に丸めると誤差が積み上がるので、累計を丸めてから差分を取る。
 *   cumulativeTarget[i] = roundTo(totalWaterG * cumulativeFraction[i], roundingG)
 *   deltaWater[i]       = cumulativeTarget[i] - cumulativeTarget[i - 1]
 * 最後の注湯ステップの累計は必ず総湯量に一致させる。
 */
export function computeCumulativeTargets(
  steps: RecipeStep[],
  totalWaterG: number,
  doseG: number,
  roundingG: number,
): number[] {
  const cumulative: number[] = [];
  let current = 0;
  let runningFraction = 0;

  for (const step of steps) {
    if (!step.waterTarget) {
      cumulative.push(current);
      continue;
    }
    const { mode, value } = step.waterTarget;
    switch (mode) {
      case "cumulative_fraction":
        runningFraction = value;
        current = roundTo(totalWaterG * runningFraction, roundingG);
        break;
      case "delta_fraction":
        runningFraction += value;
        current = roundTo(totalWaterG * runningFraction, roundingG);
        break;
      case "dose_multiple":
        // ブルームが豆量倍率で決まるレシピ: bloomWaterG = roundTo(doseG * b, roundingG)
        current = roundTo(doseG * value, roundingG);
        runningFraction = totalWaterG > 0 ? current / totalWaterG : 0;
        break;
      case "fixed_reference_g":
        current = roundTo(value, roundingG);
        runningFraction = totalWaterG > 0 ? current / totalWaterG : 0;
        break;
    }
    cumulative.push(current);
  }

  // 最終の注湯ステップを総湯量に合わせ、それ以降のステップも同じ累計にそろえる
  let lastWaterIndex = -1;
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].waterTarget) {
      lastWaterIndex = i;
      break;
    }
  }
  if (lastWaterIndex >= 0) {
    cumulative[lastWaterIndex] = totalWaterG;
    for (let i = lastWaterIndex + 1; i < cumulative.length; i++) cumulative[i] = totalWaterG;
  }
  return cumulative;
}

/** 累計から追加量を導出する */
export function toDeltas(cumulative: number[]): number[] {
  return cumulative.map((value, i) => roundTo(value - (i === 0 ? 0 : cumulative[i - 1]), 0.001));
}

interface CoreResult {
  steps: ComputedStep[];
  timings: StepTiming[];
  resolved: RecipeStep[];
  lastActiveEnd: number;
}

function computeCore(
  recipe: Recipe,
  controls: ControlValues,
  doseG: number,
  totalWaterG: number,
  baseTemperatureC: number,
): CoreResult {
  const resolved = resolveSteps(recipe, controls);
  const cumulative = computeCumulativeTargets(
    resolved,
    totalWaterG,
    doseG,
    recipe.scaling.roundingG,
  );
  const deltas = toDeltas(cumulative);
  const timings = buildTimeline(resolved, deltas);

  const steps: ComputedStep[] = resolved.map((step, index) => ({
    step,
    index,
    startSec: timings[index].startSec,
    estimatedStartSec: timings[index].estimatedStartSec,
    deltaWaterG: deltas[index],
    cumulativeWaterG: cumulative[index],
    durationSec: timings[index].durationSec,
    requiresConfirmation: isStateCondition(step.startCondition),
    confirmLabel: conditionLabel(step.startCondition),
    pattern: step.pattern,
    startCondition: step.startCondition,
    temperatureC: step.temperatureCOverride ?? baseTemperatureC,
  }));

  return { steps, timings, resolved, lastActiveEnd: lastActiveEndSec(resolved, timings) };
}

/** 原法（基準豆量・既定コントロール）での「最後の注湯終了 → 目標終了」までの落ちきり時間 */
const drawdownCache = new WeakMap<Recipe, number>();

export function referenceDrawdownSec(recipe: Recipe): number {
  const cached = drawdownCache.get(recipe);
  if (cached !== undefined) return cached;

  const controls = withControlDefaults(recipe);
  const totalWaterG = computeTotalWater(recipe, recipe.reference.doseG, controls);
  const core = computeCore(
    recipe,
    controls,
    recipe.reference.doseG,
    totalWaterG,
    recipe.reference.temperatureC,
  );
  const drawdown = Math.max(0, recipe.reference.targetFinishSec - core.lastActiveEnd);
  drawdownCache.set(recipe, drawdown);
  return drawdown;
}

export interface ComputeRecipeInput {
  recipe: Recipe;
  doseG: number;
  controls?: ControlValues;
  mode?: RecipeMode;
  arrangement?: Arrangement;
  absorptionFactor?: number;
}

function buildWarnings(
  recipe: Recipe,
  doseG: number,
  totalWaterG: number,
  ratio: number,
): RecipeWarning[] {
  const warnings: RecipeWarning[] = [];
  const range = recipe.reference.doseRangeG;

  if (range && (doseG < range[0] || doseG > range[1])) {
    warnings.push({
      id: "dose_range",
      level: "warning",
      message:
        `このレシピは${range[0]}〜${range[1]}gでの使用を想定しています。` +
        `現在の豆量では、抽出時間や挽き目の再調整が必要になる可能性があります` +
        (recipe.reference.doseRangeIsAppDefault
          ? "（推奨範囲は調査レポートに記載がないためアプリ既定値です）。"
          : "。"),
    });
  }

  if (recipe.scaling.water === "fixed_water") {
    warnings.push({
      id: "fixed_water",
      level: "info",
      message:
        `このレシピは湯量${recipe.reference.waterG}gが固定です。` +
        `豆量を変えると総湯量ではなく比率が変わります（現在 1:${ratio.toFixed(1)}）。`,
    });
  }

  if (recipe.constraints?.capacityCheck && doseG > recipe.reference.doseG) {
    warnings.push({
      id: "capacity",
      level: "info",
      message:
        `基準の${recipe.reference.doseG}gより多い豆量です。` +
        `ドリッパーの最大水位を超えないか、注ぐ前に確認してください。`,
    });
  }

  return warnings;
}

/**
 * レシピ + 豆量 + コントロール から、表示・タイマーに必要な値をすべて算出する。
 * UI はこの結果を読むだけで、レシピ固有の分岐を持たない。
 */
export function computeRecipe(input: ComputeRecipeInput): ComputedRecipe {
  const {
    recipe,
    doseG,
    mode = "original",
    arrangement = EMPTY_ARRANGEMENT,
    absorptionFactor = DEFAULT_SETTINGS.absorptionFactor,
  } = input;

  const controls = withControlDefaults(recipe, input.controls);
  const effectiveArrangement = mode === "arranged" ? arrangement : EMPTY_ARRANGEMENT;
  const totalWaterG = computeTotalWater(recipe, doseG, controls, effectiveArrangement);
  const ratio = doseG > 0 ? totalWaterG / doseG : 0;

  const temperatureC = effectiveArrangement.temperatureC ?? recipe.reference.temperatureC;
  const grindLevel = Math.min(
    10,
    Math.max(1, recipe.reference.grind.level + (effectiveArrangement.grindOffset ?? 0)),
  );

  const core = computeCore(recipe, controls, doseG, totalWaterG, temperatureC);
  const estimatedFinishSec = core.lastActiveEnd + referenceDrawdownSec(recipe);

  // finish ステップの目安時刻は、実際のタイムラインから算出した終了予定に合わせる
  const steps = core.steps.map((computed) =>
    computed.step.type === "finish"
      ? { ...computed, estimatedStartSec: estimatedFinishSec }
      : computed,
  );

  const derived: DerivedValue[] =
    recipe.derive?.({
      doseG,
      totalWaterG,
      controls,
      roundingG: recipe.scaling.roundingG,
    }) ?? [];

  const arrangedReasons: string[] = [];
  if (effectiveArrangement.ratio !== undefined) {
    arrangedReasons.push(`比率を 1:${effectiveArrangement.ratio} に変更`);
  }
  if (effectiveArrangement.temperatureC !== undefined) {
    arrangedReasons.push(`湯温を ${effectiveArrangement.temperatureC}℃ に変更`);
  }
  if (effectiveArrangement.grindOffset) {
    arrangedReasons.push(
      `挽き目を ${effectiveArrangement.grindOffset > 0 ? "粗く" : "細かく"} 調整`,
    );
  }
  for (const control of recipe.flavorControls ?? []) {
    const selected = control.options?.find((o) => o.value === controls[control.id]);
    if (selected?.adaptation) {
      arrangedReasons.push(`${control.label}「${selected.label}」は調査レポートに数値根拠なし`);
    }
  }

  // データ側の補完は「ユーザーによる変更」とは区別して開示する
  const supplementedNotes: string[] = [];
  for (const step of core.resolved) {
    if (step.adaptation) {
      supplementedNotes.push(`${step.title}: ${step.adaptationNote ?? "調査レポート外の補完値"}`);
    }
  }
  if (recipe.reference.doseRangeIsAppDefault && recipe.reference.doseRangeG) {
    supplementedNotes.push(
      `推奨粉量範囲 ${recipe.reference.doseRangeG[0]}〜${recipe.reference.doseRangeG[1]}g はアプリ既定値`,
    );
  }
  if (recipe.reference.temperatureIsAppDefault) {
    supplementedNotes.push(`湯温 ${recipe.reference.temperatureC}℃ はアプリ既定値`);
  }
  if (recipe.reference.grind.isAppDefault) {
    supplementedNotes.push(`挽き目「${recipe.reference.grind.label}」はアプリ既定値`);
  }

  return {
    recipe,
    controls,
    mode,
    arrangement: effectiveArrangement,
    doseG,
    totalWaterG,
    ratio,
    temperatureC,
    grindLevel,
    grindLabel: recipe.reference.grind.label,
    steps,
    estimatedFinishSec,
    estimatedBeverageG: estimateBeverage(recipe, totalWaterG, doseG, absorptionFactor),
    derived,
    warnings: buildWarnings(recipe, doseG, totalWaterG, ratio),
    isArranged: arrangedReasons.length > 0,
    arrangedReasons,
    supplementedNotes,
  };
}

/**
 * 推定出来上がり量。
 *   estimatedBeverageG = totalWaterG - doseG * absorptionFactor
 * レシピの正式な湯量とは別物なので、UI では必ず「推定」と明記する。
 */
export function estimateBeverage(
  recipe: Recipe,
  totalWaterG: number,
  doseG: number,
  absorptionFactor: number,
): number {
  if (recipe.beverageEstimate === "none") return 0;
  return Math.max(0, Math.round(totalWaterG - doseG * absorptionFactor));
}
