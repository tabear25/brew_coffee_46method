/**
 * 抽出タイマーの時刻計算。
 *
 * setInterval の加算ではなく「開始時刻と現在時刻の差」から経過時間を求めるため、
 * タブが非アクティブになってもずれない。一時停止中の時間は累計停止時間として除外する。
 */
export interface BrewClock {
  /** 抽出開始時刻（epoch ms）。未開始なら null */
  startedAt: number | null;
  /** 一時停止を開始した時刻（epoch ms）。停止中でなければ null */
  pausedAt: number | null;
  /** これまでに一時停止していた合計時間（ms） */
  totalPausedMs: number;
}

export const IDLE_CLOCK: BrewClock = { startedAt: null, pausedAt: null, totalPausedMs: 0 };

export function startClock(now: number): BrewClock {
  return { startedAt: now, pausedAt: null, totalPausedMs: 0 };
}

export function elapsedMs(clock: BrewClock, now: number): number {
  if (clock.startedAt === null) return 0;
  // 停止中は停止開始時刻で時間を止める
  const reference = clock.pausedAt ?? now;
  return Math.max(0, reference - clock.startedAt - clock.totalPausedMs);
}

export function elapsedSec(clock: BrewClock, now: number): number {
  return elapsedMs(clock, now) / 1000;
}

export function pauseClock(clock: BrewClock, now: number): BrewClock {
  if (clock.startedAt === null || clock.pausedAt !== null) return clock;
  return { ...clock, pausedAt: now };
}

export function resumeClock(clock: BrewClock, now: number): BrewClock {
  if (clock.pausedAt === null) return clock;
  return {
    startedAt: clock.startedAt,
    pausedAt: null,
    totalPausedMs: clock.totalPausedMs + Math.max(0, now - clock.pausedAt),
  };
}
