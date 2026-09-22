import { describe, expect, it } from "vitest";
import { elapsedSec, pauseClock, resumeClock, startClock } from "@/domain/brew-clock";

const T0 = 1_700_000_000_000;

describe("抽出タイマーの時刻計算", () => {
  it("10. 一時停止時間が経過時間から除外される", () => {
    let clock = startClock(T0);
    expect(elapsedSec(clock, T0 + 10_000)).toBe(10);

    // 10 秒時点で停止 → 停止中は経過時間が進まない
    clock = pauseClock(clock, T0 + 10_000);
    expect(elapsedSec(clock, T0 + 10_000)).toBe(10);
    expect(elapsedSec(clock, T0 + 40_000)).toBe(10);

    // 30 秒停止したあと再開 → 停止分は除外される
    clock = resumeClock(clock, T0 + 40_000);
    expect(clock.totalPausedMs).toBe(30_000);
    expect(elapsedSec(clock, T0 + 45_000)).toBe(15);
    expect(elapsedSec(clock, T0 + 100_000)).toBe(70);
  });

  it("複数回の一時停止が累積して除外される", () => {
    let clock = startClock(T0);
    clock = pauseClock(clock, T0 + 5_000);
    clock = resumeClock(clock, T0 + 15_000); // 10 秒停止
    clock = pauseClock(clock, T0 + 20_000);
    clock = resumeClock(clock, T0 + 25_000); // さらに 5 秒停止
    expect(clock.totalPausedMs).toBe(15_000);
    expect(elapsedSec(clock, T0 + 30_000)).toBe(15);
  });

  it("開始時刻と現在時刻の差から計算するので、tick を取りこぼしてもずれない", () => {
    const clock = startClock(T0);
    // タブが 3 分間バックグラウンドに回って tick が来なかった場合でも正しい
    expect(elapsedSec(clock, T0 + 180_000)).toBe(180);
  });

  it("未開始なら経過時間は 0", () => {
    expect(elapsedSec({ startedAt: null, pausedAt: null, totalPausedMs: 0 }, T0)).toBe(0);
  });

  it("停止中の再停止・未停止の再開は何もしない", () => {
    const clock = startClock(T0);
    const paused = pauseClock(clock, T0 + 1_000);
    expect(pauseClock(paused, T0 + 2_000)).toBe(paused);
    expect(resumeClock(clock, T0 + 2_000)).toBe(clock);
  });
});
