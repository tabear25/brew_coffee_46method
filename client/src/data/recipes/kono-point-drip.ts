import type { Recipe } from "@/domain/recipe.types";
import { finishStep } from "./_shared";

/**
 * KONO 名門 点滴法
 *
 * 出典（調査レポート）:
 *   豆24g / 湯240g / 1:10 / 82℃ / 中粗挽き / KONO 名門 / 目標終了 約3:30
 *   最初の 1 分を中心 30g の点滴に使い、その後、範囲と流量を段階的に広げる。
 *   累計割合 12.5% / 45.8% / 75% / 100%。
 *   注湯「量」だけでなく注湯「面積」の変化が本体なので、pattern を段階的に広げる。
 *
 * 時刻について:
 *   レポートが明示するのは「最初の1分」だけ。3・4投目は一般に流通する固定タイムラインが
 *   存在しないため、時刻を捏造せず水位の状態条件で進める。
 */
export const konoPointDrip: Recipe = {
  id: "kono_meimon_point_drip_v1",
  version: "1.0.0",
  name: "KONO 名門 点滴法",
  shortName: "KONO 点滴",
  author: "KONO（珈琲サイフォン）",
  description:
    "低温・低比率でゆっくり引き出す。中心の点滴から始め、注湯の範囲を段階的に広げていく。",
  sourceType: "original",
  group: "researched",
  brewer: { family: "cone", models: ["KONO 名門"], filter: "paper" },
  reference: {
    doseG: 24,
    waterG: 240,
    ratio: 10,
    temperatureC: 82,
    grind: { level: 7, label: "中粗挽き" },
    targetFinishSec: 210,
    doseRangeG: [20, 28],
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
      id: "drip",
      order: 1,
      type: "pour",
      startCondition: { type: "elapsed_time", valueSec: 0 },
      waterTarget: { mode: "cumulative_fraction", value: 0.125 },
      durationSec: 60,
      pattern: "center_drip",
      title: "点滴（中心）",
      instruction: "中心の一点に、1 分かけて点滴で落とす。急がない。",
    },
    {
      id: "coin",
      order: 2,
      type: "pour",
      startCondition: { type: "elapsed_time", valueSec: 60 },
      waterTarget: { mode: "cumulative_fraction", value: 0.458 },
      pattern: "coin_circle",
      title: "2投目（500円玉の円）",
      instruction: "中心に小さな円を描き、流量を少しだけ上げる。",
    },
    {
      id: "expand",
      order: 3,
      type: "pour",
      startCondition: {
        type: "water_level",
        value: "near_bed",
        label: "粉面付近まで水位が下がった",
      },
      waterTarget: { mode: "cumulative_fraction", value: 0.75 },
      pattern: "expanding_circle",
      estimateSec: 120,
      title: "3投目（円を広げる）",
      instruction: "水位が粉面付近まで下がったら、円を少しずつ広げて注ぐ。",
    },
    {
      id: "wide",
      order: 4,
      type: "pour",
      startCondition: {
        type: "water_level",
        value: "near_bed",
        label: "粉面付近まで水位が下がった",
      },
      waterTarget: { mode: "cumulative_fraction", value: 1 },
      pattern: "wide_fill",
      estimateSec: 160,
      title: "4投目（全面）",
      instruction: "全面に広げて残りを注ぎきる。",
    },
    finishStep(5, "落ちきるまで待つ。目標は約 3:30。"),
  ],
  constraints: { scalingWarningOutsideDoseRange: true, requiresStateConfirmation: true },
  metadata: {
    sourceTitle: "ハンドドリップ抽出レシピ10選と自動計算用データ設計 — 9. KONO名門 点滴法",
    notes:
      "1:10 という低い比率を一般的な V60 比率に正規化しない。3・4投目は一般に流通する固定タイムラインが無いため、時刻を補完せず水位の状態条件で進める。推奨粉量範囲はアプリ既定値。",
  },
};
