import type { Recipe } from "@/domain/recipe.types";
import { finishStep } from "./_shared";

/**
 * Scott Rao Official V60（20g / 330g）
 *
 * 出典（調査レポート）:
 *   豆20g / 湯330g / 1:16.5 / 97℃ / プラスチック V60 / 目標終了 4:00〜4:30
 *   60g ブルーム（豆量 ×3）後に強くスピンし、40 秒で 200g まで注ぐ。
 *   スラリーが約 70% 排水したら 330g まで注ぐ。
 *
 * 補完（adaptation）:
 *   第2投の開始時刻はレポートに記載がないため、一般に流通する 0:45 で補完した。
 *
 * 注意: 22g / 352g 版は別レシピとして扱う（作者名だけをキーにしない）。
 */
export const scottRaoV60: Recipe = {
  id: "scott_rao_official_v60_20_330_v1",
  version: "1.0.0",
  name: "Scott Rao Official V60（20g / 330g）",
  shortName: "Scott Rao V60",
  author: "Scott Rao",
  description: "60g ブルーム＋強いスピンで高抽出と均一性を狙う。第3投は排水状態を見て進める。",
  sourceType: "official_partner",
  group: "researched",
  brewer: { family: "cone", models: ["Hario V60 02（プラスチック）"], filter: "paper" },
  reference: {
    doseG: 20,
    waterG: 330,
    ratio: 16.5,
    temperatureC: 97,
    grind: { level: 5, label: "中挽き", isAppDefault: true },
    targetFinishSec: 270,
    targetFinishRangeSec: [240, 270],
    doseRangeG: [18, 24],
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
      id: "bloom",
      order: 1,
      type: "pour",
      startCondition: { type: "elapsed_time", valueSec: 0 },
      waterTarget: { mode: "dose_multiple", value: 3 },
      pattern: "gentle_spiral",
      title: "ブルーム",
      instruction: "豆量の 3 倍（基準 60g）を注ぐ。保温性のためプラスチック V60 を使う。",
    },
    {
      id: "bloom-spin",
      order: 2,
      type: "swirl",
      startCondition: { type: "after_previous" },
      agitation: { type: "swirl", intensity: "strong", durationSec: 5 },
      durationSec: 5,
      title: "強くスピン",
      instruction: "ドリッパーを強く回し、粉を完全に湿らせて粉層を平らにする。",
    },
    {
      id: "pour-2",
      order: 3,
      type: "pour",
      startCondition: { type: "elapsed_time", valueSec: 45 },
      // 200g / 330g = 0.606060…
      waterTarget: { mode: "cumulative_fraction", value: 200 / 330 },
      durationSec: 40,
      pattern: "gentle_spiral",
      title: "2投目（40秒で注ぐ）",
      adaptation: true,
      adaptationNote: "0:45 開始は調査レポートに記載がなく、一般に流通するタイムラインで補完",
      instruction: "40 秒かけて基準 200g まで注ぐ。",
    },
    {
      id: "pour-3",
      order: 4,
      type: "pour",
      startCondition: {
        type: "outflow_state",
        value: "seventy_percent_drained",
        label: "約70%落ちた",
      },
      waterTarget: { mode: "cumulative_fraction", value: 1 },
      pattern: "gentle_spiral",
      estimateSec: 150,
      title: "3投目（排水を見て）",
      instruction: "スラリーが約 70% 排水したら、残りを注ぎきる。",
    },
    finishStep(5, "落ちきるまで待つ。目標は 4:00〜4:30。"),
  ],
  constraints: { scalingWarningOutsideDoseRange: true, requiresStateConfirmation: true },
  metadata: {
    sourceTitle: "ハンドドリップ抽出レシピ10選と自動計算用データ設計 — 3. Scott Rao Official V60",
    notes:
      "22g / 352g・約3分の旧来版とは別レシピ。挽き目と推奨粉量範囲は調査レポートに記載がないためアプリ既定値。",
    versionNote: "Hario 掲載の 20g / 330g 版",
  },
};
