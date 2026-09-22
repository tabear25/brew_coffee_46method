import type { ComputedRecipe } from "./brew.types";

/**
 * 次のステップへ進む「予定時刻」。
 * 状態条件（水位・排水・手動確認）のステップは null を返し、時間経過では進行させない。
 */
export function scheduledStartSec(
  computed: ComputedRecipe,
  stepStartedSec: (number | undefined)[],
  index: number,
): number | null {
  const step = computed.steps[index];
  if (!step) return null;

  switch (step.startCondition.type) {
    case "elapsed_time":
      return step.startCondition.valueSec;
    case "after_previous": {
      if (index === 0) return step.startCondition.delaySec ?? 0;
      const previousStart = stepStartedSec[index - 1];
      if (previousStart === undefined) return null;
      const previousDuration = computed.steps[index - 1].durationSec ?? 0;
      return previousStart + previousDuration + (step.startCondition.delaySec ?? 0);
    }
    default:
      // water_level / outflow_state / manual_confirm は必ずユーザー確認が必要
      return null;
  }
}

/** 経過秒からみて、次のステップへ進むべきか */
export function shouldAdvance(
  computed: ComputedRecipe,
  stepStartedSec: (number | undefined)[],
  nextIndex: number,
  elapsedSeconds: number,
): boolean {
  const target = scheduledStartSec(computed, stepStartedSec, nextIndex);
  return target !== null && elapsedSeconds >= target;
}
