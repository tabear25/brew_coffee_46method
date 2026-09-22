import type {
  ControlValues,
  DeriveContext,
  DerivedValue,
  Recipe,
  RecipeStep,
} from "@/domain/recipe.types";
import { roundTo } from "@/domain/recipe-calculator";
import { finishStep } from "./_shared";

/**
 * アイス / フラッシュブリュー（Brew Mate 既存実装からの移植）
 *
 * 調査レポートには収録されていないアプリ独自メソッド。
 *   出来上がり総量（豆量 × 総比率、濃さで 13 / 15 / 16）の 40% を「氷」として
 *   サーバーに先入れし、残り 60% の「お湯」を 4:6 構造で氷に落として急冷する。
 *   豆:お湯:氷 ≒ 1:9:6（標準）。
 *
 * 総湯量（＝注ぐお湯）は 豆量 × 総比率 × 0.6 なので、濃さが実効比率を上書きする。
 */

/** 出来上がり総量（お湯 + 氷）の比率 */
const TOTAL_RATIO: Record<string, number> = { rich: 13, standard: 15, light: 16 };
/** 出来上がり総量に対する氷の割合 */
const ICE_FRACTION = 0.4;
const HOT_FRACTION = 1 - ICE_FRACTION;

/** 前半 40%（味）を 2 投に分ける比率（4:6 メソッドと共通） */
const PHASE1_SPLITS: Record<string, [number, number]> = {
  sweet: [0.42, 0.58],
  balanced: [0.5, 0.5],
  bright: [0.58, 0.42],
};
const PHASE1_FRACTION = 0.4;
const PHASE2_POURS = 3;
const INTERVAL_SEC = 45;

const DEFAULTS: ControlValues = { flavor: "balanced", flash_strength: "standard" };

function buildSteps(controls: ControlValues): RecipeStep[] {
  const split = PHASE1_SPLITS[controls.flavor] ?? PHASE1_SPLITS.balanced;
  const steps: RecipeStep[] = [
    {
      id: "pour-1",
      order: 1,
      type: "pour",
      startCondition: { type: "elapsed_time", valueSec: 0 },
      waterTarget: { mode: "cumulative_fraction", value: PHASE1_FRACTION * split[0] },
      pattern: "gentle_spiral",
      title: "1投目（味）",
      instruction: "サーバーに氷を入れた状態で、中心から円を描いて蒸らす。",
    },
    {
      id: "pour-2",
      order: 2,
      type: "pour",
      startCondition: { type: "elapsed_time", valueSec: INTERVAL_SEC },
      waterTarget: { mode: "cumulative_fraction", value: PHASE1_FRACTION },
      pattern: "gentle_spiral",
      title: "2投目（味）",
      instruction: "お湯の前半 40% を注ぎきる。",
    },
  ];

  for (let i = 0; i < PHASE2_POURS; i++) {
    steps.push({
      id: `pour-${i + 3}`,
      order: i + 3,
      type: "pour",
      startCondition: { type: "elapsed_time", valueSec: (i + 2) * INTERVAL_SEC },
      waterTarget: {
        mode: "cumulative_fraction",
        value:
          i === PHASE2_POURS - 1
            ? 1
            : PHASE1_FRACTION + (1 - PHASE1_FRACTION) * ((i + 1) / PHASE2_POURS),
      },
      pattern: "gentle_spiral",
      title: `${i + 3}投目（濃度）`,
      instruction:
        i === 0 ? "ここからは氷めがけて落とすイメージで注ぐ。" : "同じリズムで注ぎ、急冷する。",
    });
  }

  steps.push(finishStep(PHASE2_POURS + 3, "軽く混ぜて急冷する。氷が溶け残れば溶かしきる。"));
  return steps;
}

function deriveIce({ doseG, totalWaterG, controls, roundingG }: DeriveContext): DerivedValue[] {
  const totalRatio = TOTAL_RATIO[controls.flash_strength] ?? TOTAL_RATIO.standard;
  const finishedVolume = roundTo(doseG * totalRatio, roundingG);
  const ice = roundTo(finishedVolume - totalWaterG, roundingG);
  return [
    {
      id: "ice",
      label: "氷（サーバーに先入れ）",
      valueG: ice,
      emphasis: true,
      note: "抽出前にサーバーへ入れておく",
    },
    { id: "finished", label: "出来上がり総量（お湯 + 氷）", valueG: finishedVolume },
  ];
}

export const flashBrew: Recipe = {
  id: "flash_brew_v1",
  version: "1.0.0",
  name: "アイス（フラッシュブリュー）",
  shortName: "アイス",
  description: "氷に熱湯を落として急冷する日本式アイスコーヒー。お湯は 4:6 構造で分割する。",
  sourceType: "adaptation",
  group: "app",
  brewer: { family: "cone", models: ["Hario V60 02"], filter: "paper" },
  reference: {
    doseG: 20,
    // 注ぐお湯 = 出来上がり総量 300g の 60%
    waterG: 180,
    ratio: TOTAL_RATIO.standard * HOT_FRACTION,
    temperatureC: 93,
    temperatureIsAppDefault: true,
    grind: { level: 7, label: "中粗挽き", isAppDefault: true },
    targetFinishSec: 225,
    doseRangeG: [10, 50],
    doseRangeIsAppDefault: true,
  },
  scaling: {
    water: "dose_ratio",
    stepWater: "total_fraction",
    timing: "fixed_start_times",
    roundingG: 1,
  },
  flavorControls: [
    {
      id: "flavor",
      label: "味の方向性",
      hint: "お湯の前半 40% の配分",
      affects: "phase1_split",
      defaultValue: "balanced",
      options: [
        { value: "sweet", label: "甘め", description: "1投目を小さく 42 : 58" },
        { value: "balanced", label: "バランス", description: "50 : 50 の均等配分" },
        {
          value: "bright",
          label: "明るめ",
          description: "1投目を大きく 58 : 42",
          adaptation: true,
        },
      ],
    },
    {
      id: "flash_strength",
      label: "濃さ",
      hint: "出来上がり総量（お湯 + 氷）の比率",
      affects: "ratio",
      defaultValue: "standard",
      options: [
        {
          value: "rich",
          label: "しっかり濃いめ",
          description: "豆:湯:氷 ≒ 1:8:5（総量 1:13）",
          ratioOverride: TOTAL_RATIO.rich * HOT_FRACTION,
        },
        {
          value: "standard",
          label: "標準",
          description: "豆:湯:氷 ≒ 1:9:6（総量 1:15）",
          ratioOverride: TOTAL_RATIO.standard * HOT_FRACTION,
        },
        {
          value: "light",
          label: "ライト",
          description: "豆:湯:氷 ≒ 1:10:6.5（総量 1:16）",
          ratioOverride: TOTAL_RATIO.light * HOT_FRACTION,
        },
      ],
    },
  ],
  steps: buildSteps(DEFAULTS),
  buildSteps,
  derive: deriveIce,
  beverageEstimate: "none",
  constraints: { scalingWarningOutsideDoseRange: true },
  metadata: {
    sourceTitle: "Brew Mate 既存実装（client/src/lib/brew-calculator.ts の calculateFlashRecipe）",
    notes:
      "調査レポート外のアプリ独自メソッド。氷とお湯の配分・湯量は既存実装と同一。味の方向性の配分のみ、4:6 メソッドに合わせて調査レポート準拠（42:58 / 50:50 / 58:42）に更新している。湯温・挽き目はアプリ既定値。",
  },
};
