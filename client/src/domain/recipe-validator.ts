import {
  defaultControlValues,
  isStateCondition,
  resolveSteps,
  type ControlValues,
  type Recipe,
  type RecipeStep,
} from "./recipe.types";
import { computeCumulativeTargets, computeTotalWater } from "./recipe-calculator";
import { buildTimeline } from "./timeline-builder";

export interface ValidationIssue {
  recipeId: string;
  code: string;
  message: string;
  /** どのコントロール組み合わせで起きたか（動的ステップの場合） */
  variant?: string;
}

/** レシピのコントロール選択肢の全組み合わせ（連続値コントロールは既定値のみ） */
export function controlCombinations(recipe: Recipe): ControlValues[] {
  const controls = recipe.flavorControls ?? [];
  let combos: ControlValues[] = [{}];
  for (const control of controls) {
    const values = control.options?.map((o) => o.value) ?? [control.defaultValue];
    const next: ControlValues[] = [];
    for (const combo of combos) {
      for (const value of values) next.push({ ...combo, [control.id]: value });
    }
    combos = next;
  }
  return combos;
}

function validateStepList(
  recipe: Recipe,
  steps: RecipeStep[],
  variant: string | undefined,
  push: (code: string, message: string) => void,
): void {
  if (steps.length === 0) {
    push("steps_empty", "ステップが 1 つもありません");
    return;
  }

  // ステップ順の重複・欠落
  const orders = steps.map((s) => s.order);
  if (new Set(orders).size !== orders.length) {
    push("step_order_duplicate", `ステップ order が重複しています: [${orders.join(", ")}]`);
  }
  for (let i = 1; i < orders.length; i++) {
    if (orders[i] <= orders[i - 1]) {
      push(
        "step_order_not_increasing",
        `ステップ order が昇順ではありません（${orders[i - 1]} → ${orders[i]}）`,
      );
      break;
    }
  }

  const stepIds = steps.map((s) => s.id);
  if (new Set(stepIds).size !== stepIds.length) {
    push("step_id_duplicate", `ステップ id が重複しています: [${stepIds.join(", ")}]`);
  }

  // 累計割合が単調増加し、最後に 100% へ到達すること
  let runningFraction = 0;
  let sawFraction = false;
  for (const step of steps) {
    if (!step.waterTarget) continue;
    const { mode, value } = step.waterTarget;
    if (value < 0) push("negative_water", `ステップ「${step.title}」の湯量指定が負です`);
    if (mode === "cumulative_fraction") {
      sawFraction = true;
      if (value < runningFraction - 1e-9) {
        push(
          "fraction_not_monotonic",
          `累計割合が減少しています（${runningFraction} → ${value}、ステップ「${step.title}」）`,
        );
      }
      runningFraction = value;
    } else if (mode === "delta_fraction") {
      sawFraction = true;
      runningFraction += value;
    }
  }
  if (sawFraction && Math.abs(runningFraction - 1) > 1e-6) {
    push(
      "fraction_not_complete",
      `最後の累計割合が 100% になりません（${(runningFraction * 100).toFixed(2)}%）`,
    );
  }

  // 実際の湯量計算で、負の追加量が出ないこと・最終累計が総湯量に一致すること
  const totalWaterG = computeTotalWater(recipe, recipe.reference.doseG, {});
  const cumulative = computeCumulativeTargets(
    steps,
    totalWaterG,
    recipe.reference.doseG,
    recipe.scaling.roundingG,
  );
  for (let i = 0; i < cumulative.length; i++) {
    const delta = cumulative[i] - (i === 0 ? 0 : cumulative[i - 1]);
    if (delta < -1e-9) {
      push("negative_delta", `ステップ「${steps[i].title}」の追加湯量が負です（${delta}g）`);
    }
  }
  if (cumulative.length > 0 && Math.abs(cumulative[cumulative.length - 1] - totalWaterG) > 1e-6) {
    push(
      "total_mismatch",
      `最終累計湯量が総湯量と一致しません（${cumulative[cumulative.length - 1]}g / ${totalWaterG}g）`,
    );
  }

  // 固定時刻が逆行していないこと
  const deltas = cumulative.map((v, i) => v - (i === 0 ? 0 : cumulative[i - 1]));
  const timings = buildTimeline(steps, deltas);
  let lastFixed = -1;
  for (let i = 0; i < steps.length; i++) {
    const condition = steps[i].startCondition;
    if (condition.type !== "elapsed_time") continue;
    const value = condition.valueSec;
    if (value < lastFixed) {
      push("time_goes_backwards", `固定開始時刻が逆行しています（${lastFixed}s → ${value}s）`);
    }
    lastFixed = value;
  }
  for (let i = 1; i < steps.length; i++) {
    if (timings[i].startSec === null || timings[i - 1].startSec === null) continue;
    if ((timings[i].startSec as number) < (timings[i - 1].startSec as number) - 1e-9) {
      push(
        "timeline_goes_backwards",
        `ステップ「${steps[i].title}」の開始時刻が前ステップより前です`,
      );
    }
  }

  // 固定時刻と状態条件が同じステップで矛盾していないこと
  for (const step of steps) {
    const stateBased = isStateCondition(step.startCondition);
    if (stateBased && step.estimateSec !== undefined && step.estimateSec < 0) {
      push("bad_estimate", `ステップ「${step.title}」の estimateSec が負です`);
    }
    if (
      !stateBased &&
      step.startCondition.type === "elapsed_time" &&
      step.startCondition.valueSec < 0
    ) {
      push("negative_time", `ステップ「${step.title}」の開始時刻が負です`);
    }
    if (step.type === "pour" && !step.waterTarget) {
      push("pour_without_water", `注湯ステップ「${step.title}」に waterTarget がありません`);
    }
    if (step.type !== "pour" && step.waterTarget && step.type !== "finish") {
      push("water_on_non_pour", `注湯以外のステップ「${step.title}」に waterTarget があります`);
    }
  }

  if (steps[steps.length - 1].type !== "finish") {
    push("no_finish_step", "最後のステップが finish ではありません");
  }

  if (
    recipe.constraints?.requiresStateConfirmation === true &&
    !steps.some((s) => isStateCondition(s.startCondition))
  ) {
    push(
      "state_flag_mismatch",
      "requiresStateConfirmation が true ですが状態条件のステップがありません",
    );
  }
  void variant;
}

/** 1 レシピを検証する。問題がなければ空配列 */
export function validateRecipe(recipe: Recipe): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (code: string, message: string, variant?: string) =>
    issues.push({ recipeId: recipe.id, code, message, variant });

  if (!recipe.id) add("missing_id", "id がありません");
  if (!recipe.version) add("missing_version", "version がありません");
  if (!recipe.name) add("missing_name", "name がありません");
  if (!recipe.metadata?.sourceTitle) add("missing_source", "metadata.sourceTitle がありません");

  const { reference } = recipe;
  if (reference.doseG <= 0) add("bad_dose", "reference.doseG が 0 以下です");
  if (reference.waterG <= 0) add("bad_water", "reference.waterG が 0 以下です");
  if (reference.targetFinishSec <= 0)
    add("bad_target_time", "reference.targetFinishSec が 0 以下です");
  if (recipe.scaling.roundingG <= 0) add("bad_rounding", "scaling.roundingG が 0 以下です");

  const range = reference.doseRangeG;
  if (range && range[0] > range[1]) {
    add(
      "dose_range_inverted",
      `推奨粉量範囲の最小値が最大値を超えています（${range[0]} > ${range[1]}）`,
    );
  }
  if (range && (reference.doseG < range[0] || reference.doseG > range[1])) {
    add(
      "reference_dose_outside_range",
      `基準豆量 ${reference.doseG}g が推奨範囲 ${range[0]}〜${range[1]}g の外です`,
    );
  }

  if (recipe.scaling.water === "dose_ratio" && reference.ratio === undefined) {
    add("missing_ratio", "比率型レシピなのに reference.ratio がありません");
  }
  if (reference.ratio !== undefined) {
    const expected = reference.doseG * reference.ratio;
    if (Math.abs(expected - reference.waterG) > Math.max(1, reference.waterG * 0.005)) {
      add(
        "ratio_inconsistent",
        `reference の doseG × ratio（${expected.toFixed(1)}g）が waterG（${reference.waterG}g）と一致しません`,
      );
    }
  }

  const finishRange = reference.targetFinishRangeSec;
  if (finishRange && finishRange[0] > finishRange[1]) {
    add("finish_range_inverted", "targetFinishRangeSec の最小値が最大値を超えています");
  }

  for (const control of recipe.flavorControls ?? []) {
    if (control.options && !control.options.some((o) => o.value === control.defaultValue)) {
      add(
        "control_default_missing",
        `コントロール「${control.label}」の既定値が選択肢にありません`,
      );
    }
    if (!control.options && !control.range) {
      add("control_empty", `コントロール「${control.label}」に options も range もありません`);
    }
  }

  // 静的な steps と、コントロールの全組み合わせで生成したステップの両方を検証する
  validateStepList(recipe, recipe.steps, undefined, (code, message) => add(code, message));

  if (recipe.buildSteps) {
    const defaults = defaultControlValues(recipe);
    const built = recipe.buildSteps(defaults);
    if (JSON.stringify(built) !== JSON.stringify(recipe.steps)) {
      add("steps_default_mismatch", "既定コントロールでの buildSteps 出力が steps と一致しません");
    }
    for (const combo of controlCombinations(recipe)) {
      const variant = JSON.stringify(combo);
      validateStepList(recipe, resolveSteps(recipe, combo), variant, (code, message) =>
        add(code, message, variant),
      );
    }
  }

  return issues;
}

/** レシピ一覧全体を検証する（ID 重複チェックを含む） */
export function validateRecipes(recipes: Recipe[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, number>();
  for (const recipe of recipes) {
    seen.set(recipe.id, (seen.get(recipe.id) ?? 0) + 1);
  }
  for (const [id, count] of Array.from(seen.entries())) {
    if (count > 1) {
      issues.push({
        recipeId: id,
        code: "duplicate_id",
        message: `レシピ id が重複しています（${count} 件）`,
      });
    }
  }
  for (const recipe of recipes) issues.push(...validateRecipe(recipe));
  return issues;
}

/** 不正なレシピデータは黙って補正せず、開発時にエラーにする */
export function assertRecipesValid(recipes: Recipe[]): void {
  const issues = validateRecipes(recipes);
  if (issues.length === 0) return;
  const detail = issues
    .map((i) => `- [${i.recipeId}] ${i.code}: ${i.message}${i.variant ? ` (${i.variant})` : ""}`)
    .join("\n");
  throw new Error(`レシピデータが不正です:\n${detail}`);
}
