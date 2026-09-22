import type { ControlValues, Recipe, RecipeStep } from "@/domain/recipe.types";
import { finishStep } from "./_shared";

/**
 * Matt Winton 5-Pour
 *
 * 出典（調査レポート）:
 *   豆20g / 湯300g / 1:15 / 中粗〜粗挽き / 目標終了 約3:30
 *   5 回の 60g 注湯を 30 秒間隔。各投を短く強く注ぐ。スプーンやスワールなし。
 *   第1投 93℃、第2〜5投は 88℃に下げる競技系運用も可。基準流量 約6g/秒。
 */

const POUR_COUNT = 5;
const INTERVAL_SEC = 30;
const FLOW_RATE_GPS = 6;

const DEFAULTS: ControlValues = { temperature_mode: "competition" };

function buildSteps(controls: ControlValues): RecipeStep[] {
  const lowerLaterPours = controls.temperature_mode !== "home";
  const steps: RecipeStep[] = [];

  for (let i = 0; i < POUR_COUNT; i++) {
    steps.push({
      id: `pour-${i + 1}`,
      order: i + 1,
      type: "pour",
      startCondition: { type: "elapsed_time", valueSec: i * INTERVAL_SEC },
      waterTarget: {
        mode: "cumulative_fraction",
        value: i === POUR_COUNT - 1 ? 1 : (i + 1) / POUR_COUNT,
      },
      flowRateGps: FLOW_RATE_GPS,
      pattern: "aggressive_spiral",
      agitation: { type: "none", intensity: "gentle" },
      temperatureCOverride: lowerLaterPours && i > 0 ? 88 : undefined,
      title: `${i + 1}投目`,
      instruction:
        i === 0
          ? "短く強く注ぐ。スプーンやスワールでの攪拌はしない。"
          : "粉層がほぼ乾いたら次へ。短く強い注湯だけで抽出を組み立てる。",
    });
  }

  steps.push(finishStep(POUR_COUNT + 1, "最後の湯が落ちきるまで待つ。目標は約 3:30。"));
  return steps;
}

export const mattWintonFivePour: Recipe = {
  id: "matt_winton_5pour_v1",
  version: "1.0.0",
  name: "Matt Winton 5-Pour",
  shortName: "Winton 5-Pour",
  author: "Matt Winton",
  description: "浅煎りを粗めに挽き、60g × 5 投の強い注湯だけで抽出を組み立てる。攪拌は一切しない。",
  sourceType: "adaptation",
  group: "researched",
  brewer: { family: "cone", models: ["Hario V60 02"], filter: "paper" },
  reference: {
    doseG: 20,
    waterG: 300,
    ratio: 15,
    temperatureC: 93,
    grind: { level: 7, label: "中粗〜粗挽き" },
    targetFinishSec: 210,
    doseRangeG: [18, 25],
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
      id: "temperature_mode",
      label: "湯温の運用",
      hint: "第2投以降の湯温",
      affects: "temperature",
      defaultValue: "competition",
      options: [
        {
          value: "competition",
          label: "競技再現",
          description: "第1投 93℃ / 第2〜5投 88℃ に下げる",
        },
        { value: "home", label: "家庭向け簡易", description: "全投 93℃ のまま注ぐ" },
      ],
    },
  ],
  steps: buildSteps(DEFAULTS),
  buildSteps,
  constraints: { scalingWarningOutsideDoseRange: true },
  metadata: {
    sourceTitle: "ハンドドリップ抽出レシピ10選と自動計算用データ設計 — 4. Matt Winton 5-Pour",
    notes:
      "公開されている再現レシピにもとづく。粉層がほぼ乾くことも次投の条件だが、主たるトリガーは 30 秒間隔のタイマー。推奨粉量範囲はアプリ既定値。",
  },
};
