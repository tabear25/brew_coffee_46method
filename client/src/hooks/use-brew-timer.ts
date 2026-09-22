import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { elapsedSec } from "@/domain/brew-clock";
import { scheduledStartSec } from "@/domain/brew-progression";
import type { ComputedStep } from "@/domain/brew.types";
import { useBrewStore } from "@/stores/brew-store";
import { playBeep, vibrate, type BeepKind } from "@/lib/feedback";
import { useWakeLock } from "./use-wake-lock";

const TICK_MS = 200;

export interface BrewTimer {
  elapsedSec: number;
  currentStep: ComputedStep;
  nextStep: ComputedStep | null;
  /** 次のステップまでの残り秒。状態条件・最終ステップでは null */
  secondsToNext: number | null;
  /** 次のステップがユーザー確認を必要としている */
  awaitingConfirmation: boolean;
  confirmLabel: string | null;
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  progressRatio: number;
  stepProgressRatio: number;
  wakeLockSupported: boolean;
  wakeLockHeld: boolean;
  confirmNext: () => void;
  next: () => void;
  previous: () => void;
}

/**
 * 経過時間は「開始時刻と現在時刻の差」から毎 tick 計算するため、
 * タブが非アクティブでも setInterval の取りこぼしで遅れない。
 */
export function useBrewTimer(): BrewTimer {
  const store = useBrewStore();
  const { session, computed } = store;
  const [now, setNow] = useState(() => Date.now());

  const isRunning = session.status === "running" || session.status === "waiting_for_confirmation";
  const isPaused = session.status === "paused";
  const isCompleted = session.status === "completed";

  useEffect(() => {
    if (!isRunning) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [isRunning]);

  const elapsed = elapsedSec(session.clock, now);
  const steps = computed.steps;
  const currentIndex = Math.min(session.currentStepIndex, steps.length - 1);
  const currentStep = steps[currentIndex];
  const nextStep = currentIndex + 1 < steps.length ? steps[currentIndex + 1] : null;

  const nextTargetSec = useMemo(
    () => (nextStep ? scheduledStartSec(computed, session.stepStartedSec, currentIndex + 1) : null),
    [computed, session.stepStartedSec, currentIndex, nextStep],
  );

  const goToStep = useCallback(
    (index: number, atSec: number) => {
      if (index < 0 || index >= steps.length) return;
      store.advanceTo(index, atSec);
      if (steps[index].step.type === "finish") store.complete();
    },
    [steps, store],
  );

  // 時刻条件のステップは自動で進む。状態条件のステップは確認待ちにする。
  useEffect(() => {
    if (session.status !== "running" || !nextStep) return;
    if (nextTargetSec === null) {
      const currentStarted = session.stepStartedSec[currentIndex] ?? 0;
      const currentDuration = currentStep.durationSec ?? 0;
      if (elapsed >= currentStarted + currentDuration) store.awaitConfirmation();
      return;
    }
    if (elapsed >= nextTargetSec) goToStep(currentIndex + 1, nextTargetSec);
  }, [
    elapsed,
    session.status,
    session.stepStartedSec,
    currentIndex,
    currentStep,
    nextStep,
    nextTargetSec,
    goToStep,
    store,
  ]);

  // ステップが切り替わったら音とバイブレーションで知らせる
  const lastNotifiedRef = useRef<string>("");
  useEffect(() => {
    if (!isRunning && !isCompleted) {
      lastNotifiedRef.current = "";
      return;
    }
    const key = `${session.status}:${currentIndex}`;
    if (lastNotifiedRef.current === key) return;
    const isFirst = lastNotifiedRef.current === "";
    lastNotifiedRef.current = key;
    if (isFirst && !isCompleted) return;

    const kind: BeepKind = isCompleted
      ? "finish"
      : session.status === "waiting_for_confirmation"
        ? "confirm"
        : "step";
    if (store.prefs.settings.soundEnabled) playBeep(kind);
    if (store.prefs.settings.vibrationEnabled) vibrate(kind);
  }, [currentIndex, session.status, isRunning, isCompleted, store.prefs.settings]);

  const wakeLock = useWakeLock(store.prefs.settings.wakeLockEnabled && isRunning);

  const awaitingConfirmation = session.status === "waiting_for_confirmation";
  const confirmLabel = nextStep?.confirmLabel ?? null;

  const progressRatio =
    computed.estimatedFinishSec > 0 ? Math.min(1, elapsed / computed.estimatedFinishSec) : 0;

  const currentStarted = session.stepStartedSec[currentIndex] ?? 0;
  const stepSpan =
    nextTargetSec !== null
      ? Math.max(1, nextTargetSec - currentStarted)
      : Math.max(1, currentStep.durationSec ?? 1);
  const stepProgressRatio = Math.min(1, Math.max(0, (elapsed - currentStarted) / stepSpan));

  return {
    elapsedSec: elapsed,
    currentStep,
    nextStep,
    secondsToNext: nextTargetSec === null ? null : Math.max(0, nextTargetSec - elapsed),
    awaitingConfirmation,
    confirmLabel,
    isRunning,
    isPaused,
    isCompleted,
    progressRatio,
    stepProgressRatio,
    wakeLockSupported: wakeLock.supported,
    wakeLockHeld: wakeLock.held,
    confirmNext: () => nextStep && goToStep(currentIndex + 1, elapsed),
    next: () => nextStep && goToStep(currentIndex + 1, elapsed),
    previous: () => store.goBack(),
  };
}
