import type { Recipe } from "@/domain/recipe.types";
import { finishStep } from "./_shared";

/**
 * Lance Hedrick 1-2-1
 *
 * 出典（調査レポート）:
 *   豆18g / 湯306g / 1:17 / 100℃ / 中細挽き / 目標終了 約3:50
 *   「1 回注ぐ、2 分ブルーム、1 回注ぐ」。ブルーム量は豆量の 3 倍、残りを 1 回の連続注湯で入れる。
 *   メイン注湯の基準流量は約 6.3g/秒。
 *   粉量を増やすとドリッパー容量を超える可能性があるため、最大水位チェックを必須にする。
 */
export const lanceHedrick121: Recipe = {
  id: "lance_hedrick_121_v1",
  version: "1.0.0",
  name: "Lance Hedrick 1-2-1",
  shortName: "1-2-1",
  author: "Lance Hedrick",
  description:
    "1 投 → 2 分ブルーム → 1 投。操作を減らしつつ、長いブルームでガス抜きをしっかり行う。",
  sourceType: "original",
  group: "researched",
  brewer: { family: "cone", models: ["Hario V60 02"], filter: "paper" },
  reference: {
    doseG: 18,
    waterG: 306,
    ratio: 17,
    temperatureC: 100,
    grind: { level: 4, label: "中細挽き" },
    targetFinishSec: 230,
    doseRangeG: [15, 22],
    doseRangeIsAppDefault: true,
  },
  scaling: {
    water: "dose_ratio",
    stepWater: "dose_multiple",
    timing: "fixed_start_times",
    roundingG: 1,
  },
  steps: [
    {
      id: "bloom",
      order: 1,
      type: "pour",
      startCondition: { type: "elapsed_time", valueSec: 0 },
      // ブルームは豆量倍率型: bloomWaterG = roundTo(doseG * 3, roundingG)
      waterTarget: { mode: "dose_multiple", value: 3 },
      flowRateGps: 6.3,
      pattern: "gentle_spiral",
      title: "1投目（ブルーム）",
      instruction: "豆量の 3 倍の湯を一気に注ぎ、粉全体を濡らす。",
    },
    {
      id: "bloom-wait",
      order: 2,
      type: "wait",
      startCondition: { type: "after_previous" },
      title: "2分ブルーム",
      instruction: "2 分間そのまま置いてガスを抜く。触らない。",
    },
    {
      id: "main-pour",
      order: 3,
      type: "pour",
      startCondition: { type: "elapsed_time", valueSec: 120 },
      waterTarget: { mode: "cumulative_fraction", value: 1 },
      flowRateGps: 6.3,
      pattern: "gentle_spiral",
      title: "2投目（残り全量）",
      instruction: "残りを 1 回の連続注湯で入れきる。最大水位を超えないよう注意する。",
    },
    finishStep(4, "落ちきるまで待つ。目標は約 3:50。"),
  ],
  constraints: { scalingWarningOutsideDoseRange: true, capacityCheck: true },
  metadata: {
    sourceTitle: "ハンドドリップ抽出レシピ10選と自動計算用データ設計 — 5. Lance Hedrick 1-2-1",
    notes:
      "V60 02 では最大水位チェックが必須。粉量を増やすとドリッパー容量を超える可能性がある。推奨粉量範囲はアプリ既定値。",
  },
};
