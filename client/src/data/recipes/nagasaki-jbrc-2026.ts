import type { ControlValues, Recipe, RecipeStep, StepBuildContext } from "@/domain/recipe.types";
import { finishStep } from "./_shared";

/**
 * 長崎愛美 ジャパンブリュワーズカップ（JBrC）2026 優勝レシピ
 *
 * 出典（大会の抽出を要約した YouTube ショートの解説画像）:
 *   豆17.5g / 湯210g / 1:12 / V60 / 7 投式。20 秒間隔で 30g ずつ注ぐ。
 *   0:00 30g → 0:20 60g → 0:40 90g → 1:00 120g（ここまで 90℃）
 *   → 1:20 150g → 1:40 180g → 2:00 210g（75℃）
 *   お湯との接触回数を増やし、クリーンカップ・多糖類の抽出・抽出効率の向上を狙う。
 *
 * ユーザー提供情報:
 *   挽き目は中粗挽き〜粗め。粗めの目安はコマンダンテ（最大 48 クリック）で 35〜40 クリック。
 *   フィルターはリンスする。1 投 30g は豆量によらず変えない。
 *
 * 1 投固定量型（このレシピのスケーリング）:
 *   総湯量は他の比率型レシピと同じく 豆量 × 12。1 投 30g と 20 秒間隔は豆量で変えないため、
 *   豆量を変えると 1 投の量ではなく投数が変わる（15g → 180g → 6 投 / 20g → 240g → 8 投）。
 *   投数 = round(総湯量 / 30)。30g で割り切れない分は最後の 1 投で合わせる（15g 以上 45g 未満）。
 *   そのため buildSteps は総湯量（StepBuildContext）を受け取る。
 *
 * 補完（adaptation）:
 *   出典は 7 投（90℃ 4 投・75℃ 3 投）の例だけなので、7 投以外では 75℃ に切り替える位置を
 *   投数比 4 : 3 に近づけて決め（90℃ の投数 = round(投数 × 4/7)）、切替の投に印を付ける。
 *   落ちきりの時刻は出典にないため、目標終了 2:30（最終投 2:00 の約 30 秒後）はアプリ既定値。
 */

const RATIO = 12;
const REFERENCE_DOSE_G = 17.5;
const REFERENCE_WATER_G = 210;
const POUR_G = 30;
const INTERVAL_SEC = 20;
const HOT_TEMPERATURE_C = 90;
const COOL_TEMPERATURE_C = 75;
/** 出典の投数と、そのうち 90℃ で注ぐ投数 */
const REFERENCE_POUR_COUNT = 7;
const REFERENCE_HOT_POURS = 4;

const DEFAULTS: ControlValues = {};
const REFERENCE_CONTEXT: StepBuildContext = {
  doseG: REFERENCE_DOSE_G,
  totalWaterG: REFERENCE_WATER_G,
};

/** 投数。1 投 30g を保ち、端数は最後の 1 投で吸収する（最後の 1 投は 15g 以上 45g 未満） */
function pourCountFor(totalWaterG: number): number {
  return Math.max(1, Math.round(totalWaterG / POUR_G));
}

/** 90℃ で注ぐ投数。90℃ : 75℃ の投数比を出典の 4 : 3 に近づける */
function hotPourCountFor(pourCount: number): number {
  const hot = Math.round((pourCount * REFERENCE_HOT_POURS) / REFERENCE_POUR_COUNT);
  return Math.min(pourCount, Math.max(1, hot));
}

function titleFor(index: number, pourCount: number, hotPourCount: number): string {
  if (index === 0 && pourCount > 1) return "1投目（蒸らし）";
  if (index === hotPourCount) return `${index + 1}投目（${COOL_TEMPERATURE_C}℃に切替）`;
  return `${index + 1}投目`;
}

function instructionFor(index: number, pourCount: number, hotPourCount: number): string {
  const isLast = index === pourCount - 1;
  const isCool = index >= hotPourCount;
  if (index === 0) {
    return isLast
      ? "湯量が 1 投分に収まるため、総湯量を注ぎきる。"
      : `${POUR_G}g を注いで粉全体を湿らせる。以降も ${INTERVAL_SEC} 秒ごとに ${POUR_G}g ずつ注ぎ、お湯との接触回数を増やす。`;
  }
  if (index === hotPourCount) {
    return isLast
      ? `${COOL_TEMPERATURE_C}℃ の湯に切り替え、総湯量まで注ぎきる。`
      : `ここから ${COOL_TEMPERATURE_C}℃ の湯に切り替える。量とリズムは変えない。`;
  }
  if (isLast) {
    return isCool
      ? `最後の 1 投。${COOL_TEMPERATURE_C}℃ のまま総湯量まで注ぎきる。`
      : "最後の 1 投。総湯量まで注ぎきる。";
  }
  return isCool
    ? `${COOL_TEMPERATURE_C}℃ のまま、${INTERVAL_SEC} 秒ごとに ${POUR_G}g ずつ注ぐ。`
    : `${INTERVAL_SEC} 秒ごとに ${POUR_G}g ずつ、同じリズムで注ぐ。`;
}

function buildSteps(_controls: ControlValues, { totalWaterG }: StepBuildContext): RecipeStep[] {
  const pourCount = pourCountFor(totalWaterG);
  const hotPourCount = hotPourCountFor(pourCount);
  const steps: RecipeStep[] = [];

  for (let i = 0; i < pourCount; i++) {
    const isLast = i === pourCount - 1;
    const isSwitch = i === hotPourCount;
    steps.push({
      id: `pour-${i + 1}`,
      order: i + 1,
      type: "pour",
      startCondition: { type: "elapsed_time", valueSec: i * INTERVAL_SEC },
      // 累計は 30g 刻みの絶対量。最後の 1 投だけ総湯量（端数込み）に合わせる
      waterTarget: isLast
        ? { mode: "cumulative_fraction", value: 1 }
        : { mode: "fixed_reference_g", value: POUR_G * (i + 1) },
      pattern: "gentle_spiral",
      temperatureCOverride: i >= hotPourCount ? COOL_TEMPERATURE_C : undefined,
      title: titleFor(i, pourCount, hotPourCount),
      instruction: instructionFor(i, pourCount, hotPourCount),
      ...(isSwitch && pourCount !== REFERENCE_POUR_COUNT
        ? {
            adaptation: true,
            adaptationNote:
              "出典は 7 投（90℃ 4 投・75℃ 3 投）の例のみ。投数が変わるため、75℃ に切り替える位置を投数比 4 : 3 に近づけて算出",
          }
        : {}),
    });
  }

  steps.push(finishStep(pourCount + 1, "最後の湯が落ちきるまで待つ。"));
  return steps;
}

export const nagasakiJbrc2026: Recipe = {
  id: "nagasaki_jbrc2026_v1",
  version: "1.0.0",
  name: "長崎愛美 JBrC 2026 優勝レシピ",
  shortName: "JBrC 2026",
  author: "長崎愛美 / PHILOCOFFEA",
  description:
    "30g ずつ 20 秒間隔で注ぎ、お湯との接触回数を増やしてクリーンカップと抽出効率を狙う。前半 90℃・後半 75℃。ジャパンブリュワーズカップ 2026 優勝レシピ。",
  sourceType: "adaptation",
  group: "external",
  brewer: { family: "cone", models: ["Hario V60"], filter: "paper" },
  reference: {
    doseG: REFERENCE_DOSE_G,
    waterG: REFERENCE_WATER_G,
    ratio: RATIO,
    temperatureC: HOT_TEMPERATURE_C,
    // 表示幅が狭いので「クリック」は省く（詳細は metadata.notes）
    grind: { level: 8, label: "中粗挽き〜粗め（コマンダンテ 35〜40）" },
    targetFinishSec: 150,
    targetFinishIsAppDefault: true,
    doseRangeG: [15, 20],
    doseRangeIsAppDefault: true,
  },
  scaling: {
    water: "dose_ratio",
    stepWater: "fixed_reference",
    timing: "fixed_start_times",
    roundingG: 1,
  },
  steps: buildSteps(DEFAULTS, REFERENCE_CONTEXT),
  buildSteps,
  constraints: { scalingWarningOutsideDoseRange: true },
  metadata: {
    sourceTitle:
      "YouTube ショート「【日本一】普通のV60で勝てる。ジャパンブリューワー…」（@ハリオ大好き-koyo）の解説画像 ＋ ユーザー提供情報（挽き目・リンス・豆量によらず 1 投 30g）",
    notes:
      "出典は大会の抽出を要約した YouTube ショートの画像で、本人による一次資料ではない（画像にも「ザックリ解説なので大会動画で確認してね」と注記）。挽き目のコマンダンテ換算（最大 48 クリック中 35〜40 クリック）、フィルターのリンス、豆量によらず 1 投 30g とすることはユーザー提供情報。準備: フィルターをリンスしてから粉を入れ、90℃ と 75℃ の湯を用意しておく。豆量を変えると投数が変わり（15g → 6 投、20g → 8 投）、30g で割り切れない分は最後の 1 投で合わせる。7 投以外での 75℃ への切替位置、目標終了 2:30（最終投 2:00 の約 30 秒後）、推奨粉量範囲 15〜20g（投数が出典の 7 投 ±1 に収まる範囲）はアプリ既定値。注湯の流量と注ぎ方は出典に指定がない。優勝は PHILOCOFFEA のプレスリリース（2026 年 10 月）で確認。",
    versionNote: "ジャパンブリュワーズカップ 2026 優勝時の版（17.5g / 210g）",
  },
};
