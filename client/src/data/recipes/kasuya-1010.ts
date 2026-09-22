import type { Recipe } from "@/domain/recipe.types";
import { finishStep } from "./_shared";

/**
 * 10:10 メソッド（Brew Mate 既存実装からの移植）
 *
 * 調査レポートには収録されていないアプリ独自メソッド。
 *   湯量（豆量 ×15）を 10 等分し、蒸らし 45 秒＋以降 30 秒間隔で 10 投。
 *   タイム: 0:00 / 0:45 / 1:15 / 1:45 / 2:15 / 2:45 / 3:15 / 3:45 / 4:15 / 4:45
 */

const POUR_COUNT = 10;
const BLOOM_SEC = 45;
const INTERVAL_SEC = 30;

function startSec(index: number): number {
  return index === 0 ? 0 : BLOOM_SEC + (index - 1) * INTERVAL_SEC;
}

export const kasuya1010: Recipe = {
  id: "kasuya_1010_v1",
  version: "1.0.0",
  name: "10:10 メソッド",
  shortName: "10:10",
  author: "粕谷哲",
  description: "湯量を 10 等分。蒸らし 45 秒＋以降 30 秒間隔で 10 投する。",
  sourceType: "adaptation",
  group: "app",
  brewer: { family: "cone", models: ["Hario V60 02"], filter: "paper" },
  reference: {
    doseG: 20,
    waterG: 300,
    ratio: 15,
    temperatureC: 92,
    temperatureIsAppDefault: true,
    grind: { level: 8, label: "粗挽き", isAppDefault: true },
    targetFinishSec: 330,
    targetFinishRangeSec: [300, 360],
    doseRangeG: [10, 50],
    doseRangeIsAppDefault: true,
  },
  scaling: {
    water: "dose_ratio",
    stepWater: "total_fraction",
    timing: "fixed_start_times",
    roundingG: 1,
  },
  steps: [
    ...Array.from({ length: POUR_COUNT }, (_, i) => ({
      id: `pour-${i + 1}`,
      order: i + 1,
      type: "pour" as const,
      startCondition: { type: "elapsed_time" as const, valueSec: startSec(i) },
      waterTarget: {
        mode: "cumulative_fraction" as const,
        value: i === POUR_COUNT - 1 ? 1 : (i + 1) / POUR_COUNT,
      },
      pattern: "gentle_spiral" as const,
      title: i === 0 ? "蒸らし" : `${i + 1}投目`,
      instruction:
        i === 0
          ? "1/10 の湯で蒸らす。45 秒待ってから次へ。"
          : "30 秒間隔で、同じ量を同じリズムで注ぐ。",
    })),
    finishStep(POUR_COUNT + 1, "最後の湯が落ちきるまで待つ。"),
  ],
  constraints: { scalingWarningOutsideDoseRange: true },
  metadata: {
    sourceTitle: "Brew Mate 既存実装（client/src/lib/brew-calculator.ts の calculateRecipe1010）",
    notes:
      "調査レポート外のアプリ独自メソッド。湯量・注湯時刻は既存実装と同一。目標終了時間のみ、最終投（4:45）と整合するよう既存の表記（3:30〜4:30）から修正している。湯温・挽き目はアプリ既定値。",
  },
};
