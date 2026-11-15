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
 * 名前・大会名: PHILOCOFFEA のプレスリリース（PR TIMES、2026 年 10 月）
 *
 * ユーザー提供情報:
 *   挽き目は中粗挽き〜粗め（コマンダンテ 35〜40 クリック目安。コマンダンテは上限 48 クリック）。
 *   フィルターはリンスする。1 投 30g は豆量によらず変えない。
 *
 * 1 投固定量型（このレシピのスケーリング）:
 *   総湯量は他の比率型レシピと同じく 豆量 × 12（1g 単位に四捨五入）。1 投 30g と 20 秒間隔は
 *   豆量で変えないため、豆量を変えると 1 投の量ではなく投数が変わる（15g → 6 投 / 20g → 8 投）。
 *   投数 = max(1, round(総湯量 / 30))。30g で割り切れない分は最後の 1 投で合わせる。
 *   そのため buildSteps は総湯量（StepBuildContext）を受け取る。
 *
 * 湯温:
 *   画像どおり 1〜4 投目は 90℃、5 投目以降は 75℃。画像は 7 投目までなので、
 *   8 投目以降は 75℃ を続け、補完値（adaptation）として開示する。
 *
 * アプリ既定値:
 *   落ち切り時間 30 秒。終了予定 = 最終投の開始 + 30 秒で、豆量（投数）に合わせて動く
 *   （基準 17.5g では 2:00 + 30 秒 = 2:30 = targetFinishSec）。推奨粉量範囲 15〜20g。
 */

const RATIO = 12;
const REFERENCE_DOSE_G = 17.5;
const REFERENCE_WATER_G = 210;
const POUR_G = 30;
const INTERVAL_SEC = 20;
const HOT_TEMPERATURE_C = 90;
const COOL_TEMPERATURE_C = 75;
/** 画像で 90℃ の投数（1〜4 投目） */
const HOT_POURS = 4;
/** 画像に載っている投数。これより後の投の湯温は補完値 */
const IMAGE_POURS = 7;

const DEFAULTS: ControlValues = {};
const REFERENCE_CONTEXT: StepBuildContext = {
  doseG: REFERENCE_DOSE_G,
  totalWaterG: REFERENCE_WATER_G,
};

/** 投数 = 総湯量 ÷ 30 を四捨五入（最低 1 投）。端数は最後の 1 投で合わせる */
function pourCountFor(totalWaterG: number): number {
  return Math.max(1, Math.round(totalWaterG / POUR_G));
}

function titleFor(index: number): string {
  return index === HOT_POURS
    ? `${index + 1}投目（${COOL_TEMPERATURE_C}℃に切替）`
    : `${index + 1}投目`;
}

function instructionFor(index: number, pourCount: number): string {
  if (pourCount === 1) return "総湯量を注ぐ（湯量が 1 投分に収まる）。";
  const isLast = index === pourCount - 1;
  const amount = isLast ? "総湯量まで注ぐ" : `${POUR_G}g を注ぐ`;
  if (index < HOT_POURS) {
    return isLast
      ? `最後の 1 投。${amount}。`
      : `${amount}。${INTERVAL_SEC} 秒ごとに同じ量を注いで、お湯との接触回数を増やす。`;
  }
  if (index === HOT_POURS) {
    return `ここから ${COOL_TEMPERATURE_C}℃ の湯に切り替えて、${amount}${isLast ? "（最後の 1 投）" : ""}。`;
  }
  return `${isLast ? "最後の 1 投。" : ""}${COOL_TEMPERATURE_C}℃ のまま、${amount}。`;
}

function buildSteps(_controls: ControlValues, { totalWaterG }: StepBuildContext): RecipeStep[] {
  const pourCount = pourCountFor(totalWaterG);
  const steps: RecipeStep[] = [];

  for (let i = 0; i < pourCount; i++) {
    const isLast = i === pourCount - 1;
    steps.push({
      id: `pour-${i + 1}`,
      order: i + 1,
      type: "pour",
      startCondition: { type: "elapsed_time", valueSec: i * INTERVAL_SEC },
      // 累計は 30g 刻みの絶対量。最後の 1 投だけ総湯量（端数込み）に合わせる
      waterTarget: isLast
        ? { mode: "cumulative_fraction", value: 1 }
        : { mode: "fixed_reference_g", value: POUR_G * (i + 1) },
      temperatureCOverride: i >= HOT_POURS ? COOL_TEMPERATURE_C : undefined,
      title: titleFor(i),
      instruction: instructionFor(i, pourCount),
      ...(i >= IMAGE_POURS
        ? {
            adaptation: true,
            adaptationNote:
              "画像は 7 投目（2:00）までのため、8 投目以降も 5〜7 投目と同じ 75℃ を続ける",
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
    grind: { level: 7, label: "中粗挽き〜粗め（コマンダンテ 35〜40クリック）" },
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
      "YouTube ショート「【日本一】普通のV60で勝てる。ジャパンブリューワー…」（@ハリオ大好き-koyo）の解説画像 ＋ ユーザー提供情報（挽き目・リンス・豆量によらず 1 投 30g） ＋ PHILOCOFFEA のプレスリリース「「PHILOCOFFEA」所属のバリスタが快挙- 長崎愛美が ジャパンブリュワーズカップで日本チャンピオンに-」（PR TIMES、2026 年 10 月。名前・大会名の根拠。下のリンク）",
    sourceUrl: "https://prtimes.jp/main/html/rd/p/000000038.000150398.html",
    notes:
      "出典の画像は大会の抽出を要約したもので、本人による一次資料ではない（画像にも「ザックリ解説なので大会動画で確認してね」と注記）。フィルターはリンスする。90℃ と 75℃ の湯を用意しておく。挽き目のコマンダンテ換算はユーザー提供情報で、コマンダンテは上限48クリック。豆量によらず 1 投 30g・20 秒間隔なので、豆量を変えると投数が変わる（総湯量 ÷ 30 を四捨五入、最低 1 投。15g → 6 投、20g → 8 投）。30g で割り切れない分は最後の 1 投で合わせる。8 投目以降の湯温は画像にないため、5〜7 投目と同じ 75℃ を続ける（補完値）。終了予定は最終投の開始から 30 秒で落ちきる想定（アプリ既定値）で算出し、豆量に合わせて動く（基準 17.5g では 2:30）。推奨粉量範囲 15〜20g はアプリ既定値。注湯の流量と注ぎ方は出典に指定がない。",
    versionNote: "ジャパンブリュワーズカップ 2026 優勝時の版（17.5g / 210g）",
  },
};
