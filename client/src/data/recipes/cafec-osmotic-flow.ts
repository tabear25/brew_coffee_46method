import type { Recipe } from "@/domain/recipe.types";
import { finishStep } from "./_shared";

/**
 * CAFEC Osmotic Flow
 *
 * 出典（調査レポート）:
 *   豆15g / 湯250g / 1:16.7 / 90℃ / 中挽き / CAFEC Deep 27 / 目標終了 約2:30
 *   累計割合 12% / 32% / 64% / 100%。
 *   湯が粉層を通過してから次の湯を加え、濃度差を維持する。
 *   中心一点から始め、ブルームがしぼんだ後は中心付近に小さな円を描く。
 *   固定時刻より状態が重要なので、各ステップは「点滴状になったら次へ」で進める。
 */
export const cafecOsmoticFlow: Recipe = {
  id: "cafec_osmotic_flow_v1",
  version: "1.0.0",
  name: "CAFEC Osmotic Flow",
  shortName: "Osmotic Flow",
  author: "CAFEC（三洋産業）",
  description:
    "湯が粉層を通過してから次を注ぎ、濃度差を維持する。排水状態を見ながら穏やかに連続抽出する。",
  sourceType: "official_partner",
  group: "researched",
  brewer: { family: "cone", models: ["CAFEC Deep 27"], filter: "paper" },
  reference: {
    doseG: 15,
    waterG: 250,
    ratio: 16.6667,
    temperatureC: 90,
    grind: { level: 5, label: "中挽き" },
    targetFinishSec: 150,
    doseRangeG: [12, 20],
    doseRangeIsAppDefault: true,
  },
  scaling: {
    water: "dose_ratio",
    stepWater: "total_fraction",
    timing: "state_dependent",
    roundingG: 1,
  },
  steps: [
    {
      id: "pour-1",
      order: 1,
      type: "pour",
      startCondition: { type: "elapsed_time", valueSec: 0 },
      waterTarget: { mode: "cumulative_fraction", value: 0.12 },
      pattern: "center",
      title: "1投目（中心一点）",
      instruction: "中心の一点から静かに注ぎ、ブルームさせる。",
    },
    {
      id: "pour-2",
      order: 2,
      type: "pour",
      startCondition: { type: "outflow_state", value: "slow_drip", label: "点滴状になった" },
      waterTarget: { mode: "cumulative_fraction", value: 0.32 },
      pattern: "coin_circle",
      estimateSec: 45,
      title: "2投目",
      instruction: "ブルームがしぼんだら、中心付近に小さな円を描いて注ぐ。",
    },
    {
      id: "pour-3",
      order: 3,
      type: "pour",
      startCondition: { type: "outflow_state", value: "slow_drip", label: "点滴状になった" },
      waterTarget: { mode: "cumulative_fraction", value: 0.64 },
      pattern: "coin_circle",
      estimateSec: 80,
      title: "3投目",
      instruction: "落ちが点滴状になったら、同じ小さな円で注ぐ。",
    },
    {
      id: "pour-4",
      order: 4,
      type: "pour",
      startCondition: { type: "outflow_state", value: "slow_drip", label: "点滴状になった" },
      waterTarget: { mode: "cumulative_fraction", value: 1 },
      pattern: "coin_circle",
      estimateSec: 115,
      title: "4投目",
      instruction: "残りを注ぎきる。",
    },
    finishStep(5, "落ちきるまで待つ。目標は約 2:30。"),
  ],
  constraints: { scalingWarningOutsideDoseRange: true, requiresStateConfirmation: true },
  metadata: {
    sourceTitle: "ハンドドリップ抽出レシピ10選と自動計算用データ設計 — 7. CAFEC Osmotic Flow",
    notes:
      "自動タイマーはあくまで目安。ユーザーが排水状態を見て「次へ」を押して進めるセミオート運用が原法に近い。推奨粉量範囲はアプリ既定値。",
  },
};
