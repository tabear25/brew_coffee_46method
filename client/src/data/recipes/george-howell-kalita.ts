import type { Recipe } from "@/domain/recipe.types";
import { finishStep } from "./_shared";

/**
 * George Howell Kalita Wave 155
 *
 * 出典（調査レポート）:
 *   豆16〜19g / 湯265g（固定）/ 比率 1:16.6〜1:13.9 / 201〜205°F（約94〜96℃）
 *   ドリップ用中挽き / 目標終了 2:55〜3:05
 *   265g を 6 回、各 44g 前後で注ぎ、15 秒注湯と 15 秒待機を交互に行う。
 *
 * 固定湯量型:
 *   豆量を変えても総湯量は 265g のまま。豆量が濃度設定になる。
 *   アレンジモードで比率を指定した場合のみ比例計算に切り替わる（原法の派生版）。
 */

const POUR_COUNT = 6;
const CYCLE_SEC = 30; // 15 秒注湯 + 15 秒待機
const POUR_DURATION_SEC = 15;

export const georgeHowellKalita: Recipe = {
  id: "george_howell_kalita_wave155_v1",
  version: "1.0.0",
  name: "George Howell Kalita Wave 155",
  shortName: "Kalita Wave 155",
  author: "George Howell",
  description:
    "フラットベッドで 44g 前後 × 6 投。15 秒注湯・15 秒待機を繰り返し、再現性を優先する。",
  sourceType: "original",
  group: "researched",
  brewer: { family: "flat_bottom", models: ["Kalita Wave 155"], filter: "paper" },
  reference: {
    doseG: 17,
    waterG: 265,
    temperatureC: 95,
    temperatureRangeC: [94, 96],
    grind: { level: 5, label: "ドリップ用中挽き" },
    targetFinishSec: 185,
    targetFinishRangeSec: [175, 185],
    doseRangeG: [16, 19],
  },
  scaling: {
    water: "fixed_water",
    stepWater: "total_fraction",
    timing: "fixed_start_times",
    roundingG: 1,
  },
  steps: [
    ...Array.from({ length: POUR_COUNT }, (_, i) => ({
      id: `pour-${i + 1}`,
      order: i + 1,
      type: "pour" as const,
      startCondition: { type: "elapsed_time" as const, valueSec: i * CYCLE_SEC },
      waterTarget: {
        mode: "cumulative_fraction" as const,
        value: i === POUR_COUNT - 1 ? 1 : (i + 1) / POUR_COUNT,
      },
      durationSec: POUR_DURATION_SEC,
      pattern: "expanding_circle" as const,
      title: `${i + 1}投目`,
      instruction:
        i === 0
          ? "15 秒かけて注ぎ、15 秒待つ。以降このリズムを守る。"
          : "15 秒注湯・15 秒待機。フラットベッドを保つように均等に注ぐ。",
    })),
    finishStep(POUR_COUNT + 1, "落ちきるまで待つ。目標は 2:55〜3:05。"),
  ],
  constraints: { scalingWarningOutsideDoseRange: true },
  metadata: {
    sourceTitle:
      "ハンドドリップ抽出レシピ10選と自動計算用データ設計 — 8. George Howell Kalita Wave 155",
    notes:
      "公式ガイドは豆量を 16〜19g の範囲で提示しつつ湯量を 265g に固定するため、豆量に応じて比率が変わる。比例モード（例 1:15.6）は原法の派生版として扱う。基準豆量 17g は範囲の中央値としてアプリが選んだ値。",
  },
};
