import type { ControlValues, Recipe, RecipeStep } from "@/domain/recipe.types";
import { finishStep } from "./_shared";

/**
 * 粕谷哲 4:6 メソッド
 *
 * 出典（調査レポート）:
 *   基準 豆20g / 湯300g / 1:15 / 92℃ / 粗挽き / 目標終了 3:30
 *   総湯量の 40% を最初の 2 投（味）、残る 60% を後半（濃度）に使う。
 *   甘み寄りは第1投 42% / 第2投 58%（公式 20g 例は 50g + 70g）。
 *   酸味寄りは「第1投を第2投より大きくする」とのみ記載され、数値根拠はない。
 */

/** 前半 40%（味）を 2 投に分ける比率 */
const PHASE1_SPLITS: Record<string, [number, number]> = {
  sweet: [0.42, 0.58],
  balanced: [0.5, 0.5],
  // レポートに数値根拠がないため、甘め設定の鏡像を既定として adaptation 扱いにする
  bright: [0.58, 0.42],
};

/** 後半 60%（濃度）の投数 */
const PHASE2_POURS: Record<string, number> = { light: 2, medium: 3, strong: 4 };

const PHASE1_FRACTION = 0.4;
const INTERVAL_SEC = 45;

const DEFAULTS: ControlValues = { flavor: "balanced", strength: "medium" };

function buildSteps(controls: ControlValues): RecipeStep[] {
  const split = PHASE1_SPLITS[controls.flavor] ?? PHASE1_SPLITS.balanced;
  const phase2Pours = PHASE2_POURS[controls.strength] ?? PHASE2_POURS.medium;
  const steps: RecipeStep[] = [];

  steps.push({
    id: "pour-1",
    order: 1,
    type: "pour",
    startCondition: { type: "elapsed_time", valueSec: 0 },
    waterTarget: { mode: "cumulative_fraction", value: PHASE1_FRACTION * split[0] },
    pattern: "gentle_spiral",
    title: "1投目（味）",
    instruction: "中心から円を描くように注ぎ、蒸らしながら味の方向性を決める。",
  });

  steps.push({
    id: "pour-2",
    order: 2,
    type: "pour",
    startCondition: { type: "elapsed_time", valueSec: INTERVAL_SEC },
    waterTarget: { mode: "cumulative_fraction", value: PHASE1_FRACTION },
    pattern: "gentle_spiral",
    title: "2投目（味）",
    instruction: "前半 40% を注ぎきる。ここまでで味の方向性が決まる。",
  });

  for (let i = 0; i < phase2Pours; i++) {
    const cumulative = PHASE1_FRACTION + (1 - PHASE1_FRACTION) * ((i + 1) / phase2Pours);
    steps.push({
      id: `pour-${i + 3}`,
      order: i + 3,
      type: "pour",
      startCondition: { type: "elapsed_time", valueSec: (i + 2) * INTERVAL_SEC },
      waterTarget: { mode: "cumulative_fraction", value: i === phase2Pours - 1 ? 1 : cumulative },
      pattern: "gentle_spiral",
      title: `${i + 3}投目（濃度）`,
      instruction:
        i === 0
          ? "後半 60% の 1 投目。ここからは濃度をつくる。"
          : "湯面が落ちきるのを待ってから、同じリズムで注ぐ。",
    });
  }

  steps.push(finishStep(phase2Pours + 3, "最後の湯が落ちきったらドリッパーを外す。"));
  return steps;
}

export const kasuya46: Recipe = {
  id: "kasuya_46_v1",
  version: "1.0.0",
  name: "粕谷哲 4:6 メソッド",
  shortName: "4:6",
  author: "粕谷哲",
  description:
    "総湯量の前半 40% で味の方向性を、後半 60% で濃度を決める。World Brewers Cup 2016 優勝レシピ。",
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
    doseRangeG: [15, 30],
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
      id: "flavor",
      label: "味の方向性",
      hint: "前半 40% の 2 投の配分",
      affects: "phase1_split",
      defaultValue: "balanced",
      options: [
        {
          value: "sweet",
          label: "甘め",
          description: "1投目を小さく 42 : 58（公式 20g 例の 50g + 70g と一致）",
        },
        { value: "balanced", label: "バランス", description: "50 : 50 の均等配分" },
        {
          value: "bright",
          label: "明るめ",
          description: "1投目を大きく 58 : 42（方向性のみ公式。数値根拠なし）",
          adaptation: true,
        },
      ],
    },
    {
      id: "strength",
      label: "濃さ",
      hint: "後半 60% の投数",
      affects: "phase2_pours",
      defaultValue: "medium",
      options: [
        { value: "light", label: "軽め", description: "後半 2 投。さっぱりした味わい" },
        { value: "medium", label: "標準", description: "後半 3 投。公式の標準構成" },
        { value: "strong", label: "濃いめ", description: "後半 4 投。しっかりした濃度" },
      ],
    },
  ],
  steps: buildSteps(DEFAULTS),
  buildSteps,
  constraints: { scalingWarningOutsideDoseRange: true },
  metadata: {
    sourceTitle: "ハンドドリップ抽出レシピ10選と自動計算用データ設計 — 1. 粕谷哲 4:6",
    notes:
      "後半の投数を変えると目標抽出時間も変わる。注湯の流量は調査レポートに記載がないため、注湯時間は表示しない。推奨粉量範囲はアプリ既定値。",
  },
};
