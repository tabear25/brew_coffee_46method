import type { Recipe } from "@/domain/recipe.types";
import { finishStep } from "./_shared";

/**
 * Patrik Rolf / April — 6 Aggressive Pulses
 *
 * 出典（調査レポート）:
 *   豆20g / 湯300g / 1:15 / 92℃ / 粗挽き / 目標終了 3:20〜3:30
 *   各投 50g（総湯量の 1/6）、開始 0:00 / 0:40 / 1:10 / 1:40 / 2:10 / 2:40。
 *   1 投を約 8 秒で注ぐ（約 6.25g/秒）。全投を円状に強く注ぐ。
 *   水は硬度 90〜110ppm が公開レシピの目安。
 */

const START_TIMES_SEC = [0, 40, 70, 100, 130, 160];
const FLOW_RATE_GPS = 6.25;

export const aprilSixPulses: Recipe = {
  id: "april_six_aggressive_pulses_v1",
  version: "1.0.0",
  name: "April 6 Aggressive Pulses",
  shortName: "April 6 Pulses",
  author: "Patrik Rolf / April Coffee Roasters",
  description:
    "粗挽きと強い攪拌を組み合わせ、50g × 6 投で華やかさと甘さを出す。最初の間隔だけ 40 秒。",
  sourceType: "original",
  group: "researched",
  brewer: { family: "cone", models: ["Hario V60 02"], filter: "paper" },
  reference: {
    doseG: 20,
    waterG: 300,
    ratio: 15,
    temperatureC: 92,
    grind: { level: 8, label: "粗挽き" },
    targetFinishSec: 210,
    targetFinishRangeSec: [200, 210],
    doseRangeG: [18, 25],
    doseRangeIsAppDefault: true,
  },
  scaling: {
    water: "dose_ratio",
    stepWater: "total_fraction",
    timing: "fixed_start_times",
    roundingG: 1,
  },
  steps: [
    ...START_TIMES_SEC.map((valueSec, i) => ({
      id: `pour-${i + 1}`,
      order: i + 1,
      type: "pour" as const,
      startCondition: { type: "elapsed_time" as const, valueSec },
      waterTarget: {
        mode: "cumulative_fraction" as const,
        value: i === START_TIMES_SEC.length - 1 ? 1 : (i + 1) / START_TIMES_SEC.length,
      },
      flowRateGps: FLOW_RATE_GPS,
      pattern: "aggressive_spiral" as const,
      agitation: { type: "none" as const, intensity: "strong" as const },
      title: `${i + 1}投目`,
      instruction:
        i === 0
          ? "円を描きながら強く注ぐ。粗挽きの抽出不足を注湯の攪拌で補う。"
          : "同じ強さで円状に注ぐ。間隔は 30 秒（初回のみ 40 秒）。",
    })),
    finishStep(START_TIMES_SEC.length + 1, "最後の湯が落ちきるまで待つ。目標は 3:20〜3:30。"),
  ],
  constraints: { scalingWarningOutsideDoseRange: true },
  metadata: {
    sourceTitle:
      "ハンドドリップ抽出レシピ10選と自動計算用データ設計 — 6. Patrik Rolf / April 6 Aggressive Pulses",
    notes:
      "水の硬度 90〜110ppm が公開レシピの目安。最初の間隔だけ 40 秒、その後は 30 秒間隔という非対称タイムラインをそのまま保存している。推奨粉量範囲はアプリ既定値。",
  },
};
