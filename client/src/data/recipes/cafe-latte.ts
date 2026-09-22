import type { DeriveContext, DerivedValue, Recipe } from "@/domain/recipe.types";
import { roundTo } from "@/domain/recipe-calculator";
import { finishStep } from "./_shared";

/**
 * カフェラテ用抽出（Brew Mate 既存実装からの移植）
 *
 * 調査レポートには収録されていないアプリ独自メソッド。
 *   豆:湯 = 1:10。湯量を 5 等分し、蒸らし 45 秒＋以降 45 秒間隔で 5 投。
 *   コーヒー:ミルク は合計 10 パートの配分（1:9 〜 10:0、既定 4:6）。
 *   抽出湯量は固定で、比率を変えるとミルク量だけが増減する。
 */

const POUR_COUNT = 5;
const INTERVAL_SEC = 45;
export const LATTE_TOTAL_PARTS = 10;
export const LATTE_MIN_COFFEE_PARTS = 1;

function deriveMilk({ totalWaterG, controls, roundingG }: DeriveContext): DerivedValue[] {
  const parsed = Number.parseInt(controls.milk_ratio ?? "4", 10);
  const coffeeParts = Math.min(
    LATTE_TOTAL_PARTS,
    Math.max(LATTE_MIN_COFFEE_PARTS, Number.isNaN(parsed) ? 4 : parsed),
  );
  const milkParts = LATTE_TOTAL_PARTS - coffeeParts;
  const milkAmount = roundTo((totalWaterG * milkParts) / coffeeParts, roundingG);

  return [
    {
      id: "milk",
      label: `必要ミルク量（コーヒー ${coffeeParts} : ミルク ${milkParts}）`,
      valueG: milkAmount,
      emphasis: true,
      note: milkParts === 0 ? "ミルクなし（ブラックコーヒー）" : undefined,
    },
    {
      id: "finished",
      label: "できあがり量（コーヒー + ミルク）",
      valueG: roundTo(totalWaterG + milkAmount, roundingG),
    },
  ];
}

export const cafeLatte: Recipe = {
  id: "cafe_latte_v1",
  version: "1.0.0",
  name: "カフェラテ",
  shortName: "カフェラテ",
  description: "豆:湯 = 1:10 で濃いめに 5 投。コーヒーとミルクの配分から必要ミルク量も計算する。",
  sourceType: "adaptation",
  group: "app",
  brewer: { family: "cone", models: ["Hario V60 02"], filter: "paper" },
  reference: {
    doseG: 15,
    waterG: 150,
    ratio: 10,
    temperatureC: 92,
    temperatureIsAppDefault: true,
    grind: { level: 5, label: "中挽き", isAppDefault: true },
    targetFinishSec: 225,
    doseRangeG: [5, 50],
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
      id: "milk_ratio",
      label: "コーヒーとミルクの割合",
      hint: `合計 ${LATTE_TOTAL_PARTS} パートをコーヒー側に何パート割り当てるか`,
      affects: "milk_ratio",
      defaultValue: "4",
      range: { min: LATTE_MIN_COFFEE_PARTS, max: LATTE_TOTAL_PARTS, step: 1, unitLabel: "パート" },
    },
  ],
  steps: [
    ...Array.from({ length: POUR_COUNT }, (_, i) => ({
      id: `pour-${i + 1}`,
      order: i + 1,
      type: "pour" as const,
      startCondition: { type: "elapsed_time" as const, valueSec: i * INTERVAL_SEC },
      waterTarget: {
        mode: "cumulative_fraction" as const,
        value: i === POUR_COUNT - 1 ? 1 : (i + 1) / POUR_COUNT,
      },
      pattern: "gentle_spiral" as const,
      title: i === 0 ? "蒸らし" : `${i + 1}投目`,
      instruction:
        i === 0
          ? "1/5 の湯で蒸らす。45 秒待ってから次へ。"
          : "45 秒間隔で同じ量を注ぐ。ミルクに負けない濃さを狙う。",
    })),
    finishStep(POUR_COUNT + 1, "落ちきったら、温めたミルクを合わせる。"),
  ],
  derive: deriveMilk,
  beverageEstimate: "none",
  constraints: { scalingWarningOutsideDoseRange: true },
  metadata: {
    sourceTitle: "Brew Mate 既存実装（client/src/lib/brew-calculator.ts の calculateLatteRecipe）",
    notes:
      "調査レポート外のアプリ独自メソッド。既存実装は抽出湯量を入力していたが、本実装では他レシピと同じく豆量入力に統一した（湯量 = 豆量 ×10 で等価）。湯温・挽き目はアプリ既定値。",
  },
};
