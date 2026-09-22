import type { RecipeStep } from "./recipe.types";

/** 状態条件ステップの「目安」開始時刻を置くときの既定の間隔（表示専用・進行判定には使わない） */
export const DEFAULT_STATE_GAP_SEC = 30;

export interface StepTiming {
  /** 時間経過だけで進行できるステップの開始秒。状態条件では null */
  startSec: number | null;
  /** 表示・進捗計算用の目安開始秒（常に数値） */
  estimatedStartSec: number;
  /** 所要秒。導出できない場合は null */
  durationSec: number | null;
}

/**
 * 注湯時間は流量から再計算する（時刻を豆量に比例させない）。
 *   pourDurationSec = deltaWaterG / flowRateGps
 * durationSec が明示されていればそちらを優先する。
 */
export function resolvePourDuration(step: RecipeStep, deltaWaterG: number): number | null {
  if (step.durationSec !== undefined) return step.durationSec;
  if (step.flowRateGps && step.flowRateGps > 0 && deltaWaterG > 0) {
    return Math.round(deltaWaterG / step.flowRateGps);
  }
  return null;
}

/**
 * ステップ列にタイムラインを付ける。
 *
 *  - elapsed_time … 固定の開始時刻。豆量が変わっても動かさない
 *  - after_previous … 前ステップの終了 + delaySec
 *  - 状態条件 … startSec は null（自動進行させない）。目安だけ estimatedStartSec に入れる
 */
export function buildTimeline(steps: RecipeStep[], deltaWaterG: number[]): StepTiming[] {
  const count = steps.length;
  const startSec: (number | null)[] = new Array(count).fill(null);
  const estimatedStartSec: number[] = new Array(count).fill(0);
  const durationSec: (number | null)[] = new Array(count).fill(null);

  for (let i = 0; i < count; i++) {
    const step = steps[i];
    const previousEnd = i === 0 ? 0 : estimatedStartSec[i - 1] + (durationSec[i - 1] ?? 0);

    if (step.startCondition.type === "elapsed_time") {
      startSec[i] = step.startCondition.valueSec;
      estimatedStartSec[i] = step.startCondition.valueSec;
    } else if (step.startCondition.type === "after_previous") {
      const delay = step.startCondition.delaySec ?? 0;
      estimatedStartSec[i] = previousEnd + delay;
      // 前ステップの時刻が確定している場合だけ、この時刻も確定扱いにする
      startSec[i] = i === 0 || startSec[i - 1] !== null ? estimatedStartSec[i] : null;
    } else {
      estimatedStartSec[i] = step.estimateSec ?? previousEnd + DEFAULT_STATE_GAP_SEC;
      startSec[i] = null;
    }

    durationSec[i] = resolvePourDuration(step, deltaWaterG[i] ?? 0);
  }

  // 待機ステップの長さは、次のステップの開始時刻から逆算する
  for (let i = 0; i < count; i++) {
    if (durationSec[i] !== null || steps[i].type !== "wait") continue;
    if (i + 1 >= count) continue;
    durationSec[i] = Math.max(0, estimatedStartSec[i + 1] - estimatedStartSec[i]);
  }

  return steps.map((_, i) => ({
    startSec: startSec[i],
    estimatedStartSec: estimatedStartSec[i],
    durationSec: durationSec[i],
  }));
}

/** finish ステップを除いた最後のステップの終了秒 */
export function lastActiveEndSec(steps: RecipeStep[], timings: StepTiming[]): number {
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].type === "finish") continue;
    return timings[i].estimatedStartSec + (timings[i].durationSec ?? 0);
  }
  return 0;
}
