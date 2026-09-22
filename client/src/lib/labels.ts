import type {
  AgitationIntensity,
  BrewerFamily,
  PourPattern,
  SourceType,
  StartCondition,
  StepType,
} from "@/domain/recipe.types";

export const PATTERN_LABELS: Record<PourPattern, string> = {
  center: "中心一点",
  gentle_spiral: "中心から円を描く",
  aggressive_spiral: "強く円を描く",
  center_to_outer: "中心から外へ",
  center_drip: "中心に点滴",
  coin_circle: "500円玉大の円",
  expanding_circle: "円を広げる",
  wide_fill: "全面に広げる",
};

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  pour: "注湯",
  wait: "待機",
  swirl: "スワール",
  stir: "撹拌",
  manual_confirmation: "確認",
  remove_dripper: "ドリッパーを外す",
  finish: "終了",
};

export const AGITATION_INTENSITY_LABELS: Record<AgitationIntensity, string> = {
  gentle: "やさしく",
  medium: "普通に",
  strong: "強く",
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  original: "作者公開レシピ",
  official_partner: "メーカー公式",
  adaptation: "再現・翻案",
};

export const BREWER_FAMILY_LABELS: Record<BrewerFamily, string> = {
  cone: "円錐（コーン）",
  flat_bottom: "フラットベッド",
  chemex: "ケメックス",
};

/**
 * 流量はユーザーにとって分かりにくいため、UI では強さの語を主表示にする。
 * g/秒 は詳細（出典ダイアログ・プレビューの補足）でのみ見せる。
 */
export function flowStrengthLabel(flowRateGps: number | undefined): string | null {
  if (flowRateGps === undefined) return null;
  if (flowRateGps < 4) return "細く";
  if (flowRateGps < 6) return "普通";
  return "強め";
}

/** 1 = 極細 〜 10 = 極粗 の相対スケール */
export function grindScaleLabel(level: number): string {
  if (level <= 2) return "極細";
  if (level <= 4) return "中細";
  if (level <= 6) return "中";
  if (level <= 8) return "中粗〜粗";
  return "極粗";
}

/** 開始条件の説明文（プレビューの「待機条件」列） */
export function startConditionLabel(condition: StartCondition): string {
  switch (condition.type) {
    case "elapsed_time":
      return "時刻で自動";
    case "after_previous":
      return condition.delaySec ? `前の操作から ${condition.delaySec} 秒後` : "前の操作のあとすぐ";
    case "water_level":
    case "outflow_state":
    case "manual_confirm":
      return `確認: ${condition.label}`;
  }
}
