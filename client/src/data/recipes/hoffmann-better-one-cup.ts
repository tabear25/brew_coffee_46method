import type { Recipe } from "@/domain/recipe.types";
import { finishStep } from "./_shared";

/**
 * James Hoffmann — Better 1 Cup V60
 *
 * 出典（調査レポート）:
 *   基準 豆15g / 湯250g / 1:16.6667 / 浅煎りは沸騰直後（JSON 例では 100℃）/ 中細挽き
 *   50g ずつ 5 段階（累計 20/40/60/80/100%）。各メインパルスの間に約 10 秒の休止。
 *   注湯は低い位置から約 5g/秒で均一に。目標終了 約 3:00（多少の差は許容）。
 *
 * 補完（adaptation）:
 *   レポートは各投の開始時刻を示していない。ブルーム後 0:45 から注ぎ始める、
 *   一般に流通する Hoffmann のタイムラインで補完した。
 */
export const hoffmannBetterOneCup: Recipe = {
  id: "hoffmann_better_1cup_v1",
  version: "1.0.0",
  name: "James Hoffmann Better 1 Cup",
  shortName: "Hoffmann 1 Cup",
  author: "James Hoffmann",
  description: "1 杯分を再現性高く淹れるための V60 レシピ。50g ずつ 5 回、約 5g/秒で均一に注ぐ。",
  sourceType: "original",
  group: "researched",
  brewer: { family: "cone", models: ["Hario V60 01", "Hario V60 02"], filter: "paper" },
  reference: {
    doseG: 15,
    waterG: 250,
    ratio: 16.6667,
    temperatureC: 100,
    grind: { level: 4, label: "中細挽き" },
    targetFinishSec: 180,
    doseRangeG: [12, 20],
  },
  scaling: {
    water: "dose_ratio",
    stepWater: "total_fraction",
    timing: "fixed_start_times",
    roundingG: 1,
  },
  steps: [
    {
      id: "bloom",
      order: 1,
      type: "pour",
      startCondition: { type: "elapsed_time", valueSec: 0 },
      waterTarget: { mode: "cumulative_fraction", value: 0.2 },
      flowRateGps: 5,
      pattern: "gentle_spiral",
      title: "ブルーム",
      instruction: "低い位置から中心→外へ円を描き、約 5g/秒で注ぐ。",
    },
    {
      id: "bloom-swirl",
      order: 2,
      type: "swirl",
      startCondition: { type: "after_previous" },
      agitation: { type: "swirl", intensity: "gentle", durationSec: 5 },
      durationSec: 5,
      title: "スワール",
      instruction: "ドリッパーを軽く回して、粉全体を均一に湿らせる。",
    },
    {
      id: "pour-2",
      order: 3,
      type: "pour",
      startCondition: { type: "elapsed_time", valueSec: 45 },
      waterTarget: { mode: "cumulative_fraction", value: 0.4 },
      flowRateGps: 5,
      pattern: "gentle_spiral",
      title: "2投目",
      adaptation: true,
      adaptationNote: "0:45 開始は調査レポートに記載がなく、一般に流通するタイムラインで補完",
      instruction: "低い位置から約 5g/秒で注ぐ。秒数よりも流量の均一さを優先する。",
    },
    {
      id: "pour-3",
      order: 4,
      type: "pour",
      startCondition: { type: "after_previous", delaySec: 10 },
      waterTarget: { mode: "cumulative_fraction", value: 0.6 },
      flowRateGps: 5,
      pattern: "gentle_spiral",
      title: "3投目",
      instruction: "前の注湯から約 10 秒休んで注ぐ。",
    },
    {
      id: "pour-4",
      order: 5,
      type: "pour",
      startCondition: { type: "after_previous", delaySec: 10 },
      waterTarget: { mode: "cumulative_fraction", value: 0.8 },
      flowRateGps: 5,
      pattern: "gentle_spiral",
      title: "4投目",
      instruction: "前の注湯から約 10 秒休んで注ぐ。",
    },
    {
      id: "pour-5",
      order: 6,
      type: "pour",
      startCondition: { type: "after_previous", delaySec: 10 },
      waterTarget: { mode: "cumulative_fraction", value: 1 },
      flowRateGps: 5,
      pattern: "gentle_spiral",
      title: "5投目",
      instruction: "最後の 1 投で総湯量まで到達させる。",
    },
    finishStep(7, "目標は約 3:00。多少ずれても問題ない。最終判断は味で行う。"),
  ],
  constraints: { scalingWarningOutsideDoseRange: true },
  metadata: {
    sourceTitle:
      "ハンドドリップ抽出レシピ10選と自動計算用データ設計 — 2. James Hoffmann Better 1 Cup",
    notes:
      "同じ Hoffmann でも 30g / 500g の Ultimate V60 は別レシピ。秒数やグラムへの固執より、低い位置から約 5g/秒で均一に注ぐことが重視される。",
    versionNote: "15g / 250g の Better 1 Cup 版",
  },
};
