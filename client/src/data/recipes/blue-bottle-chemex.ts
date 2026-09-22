import type { Recipe } from "@/domain/recipe.types";
import { finishStep } from "./_shared";

/**
 * Blue Bottle Chemex
 *
 * 出典（調査レポート）:
 *   豆50g / 湯700g / 1:14 / 205〜210°F（約96〜99℃）/ 中粗挽き（海塩程度）/ 目標終了 約4:00
 *   4 投構成。累計割合 14.29% / 42.86% / 71.43% / 100%。
 *   Chemex フィルターの三層側を注ぎ口側に置き、フィルターへ直接湯を当てない。
 *   推奨入力範囲は 35〜60g 程度。
 *
 * 補完（adaptation）:
 *   2投目の開始時刻はレポートに記載がないため、一般に流通する 0:45 で補完した。
 *   3・4投目は水位が下がるのを待つ運用のため、状態条件で進める。
 */
export const blueBottleChemex: Recipe = {
  id: "blue_bottle_chemex_v1",
  version: "1.0.0",
  name: "Blue Bottle Chemex",
  shortName: "BB Chemex",
  author: "Blue Bottle Coffee",
  description: "厚いフィルターで複数杯をクリアに抽出する。50g / 700g の 4 投構成。",
  sourceType: "official_partner",
  group: "researched",
  brewer: { family: "chemex", models: ["Chemex 6-cup"], filter: "paper" },
  reference: {
    doseG: 50,
    waterG: 700,
    ratio: 14,
    temperatureC: 97,
    temperatureRangeC: [96, 99],
    grind: { level: 7, label: "中粗挽き（海塩程度）" },
    targetFinishSec: 240,
    doseRangeG: [35, 60],
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
      waterTarget: { mode: "cumulative_fraction", value: 1 / 7 },
      pattern: "gentle_spiral",
      title: "ブルーム",
      instruction: "粉全体が湿るまで、ゆっくり螺旋を描いて注ぐ。フィルターに直接当てない。",
    },
    {
      id: "pour-2",
      order: 2,
      type: "pour",
      startCondition: { type: "elapsed_time", valueSec: 45 },
      waterTarget: { mode: "cumulative_fraction", value: 3 / 7 },
      pattern: "gentle_spiral",
      title: "2投目",
      adaptation: true,
      adaptationNote: "0:45 開始は調査レポートに記載がなく、一般に流通するタイムラインで補完",
      instruction: "ゆっくりした螺旋で注ぐ。縁とフィルターには当てない。",
    },
    {
      id: "pour-3",
      order: 3,
      type: "pour",
      startCondition: {
        type: "water_level",
        value: "partially_drained",
        label: "水位が下がった",
      },
      waterTarget: { mode: "cumulative_fraction", value: 5 / 7 },
      pattern: "gentle_spiral",
      estimateSec: 105,
      title: "3投目",
      instruction: "水位が下がったら注ぎ足す。粉層を動かしすぎない。",
    },
    {
      id: "pour-4",
      order: 4,
      type: "pour",
      startCondition: {
        type: "water_level",
        value: "partially_drained",
        label: "水位が下がった",
      },
      waterTarget: { mode: "cumulative_fraction", value: 1 },
      pattern: "gentle_spiral",
      estimateSec: 150,
      title: "4投目",
      instruction: "残りを注ぎきる。",
    },
    finishStep(5, "落ちきったらフィルターを外す。目標は約 4:00（豆によって延長可）。"),
  ],
  constraints: { scalingWarningOutsideDoseRange: true, requiresStateConfirmation: true },
  metadata: {
    sourceTitle: "ハンドドリップ抽出レシピ10選と自動計算用データ設計 — 10. Blue Bottle Chemex",
    notes:
      "準備: Chemex フィルターの三層側を注ぎ口側に置き、湯通ししてから粉を入れる。50g を大きく下回るとChemexの粉層厚と流速が変わるため、35〜60g の範囲で使う。一般的な 42g / 700g・1:16.7 の Chemex レシピとは別 ID。",
    versionNote: "Blue Bottle 版（50g / 700g / 1:14）",
  },
};
