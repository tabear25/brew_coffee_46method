/**
 * ステップ切り替え時の音・バイブレーション。
 * 非対応ブラウザでは静かに何もしない（アプリ本体は動き続ける）。
 */

type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    context ??= new Ctor();
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
}

/** 最初のユーザー操作で AudioContext を起こしておく（iOS 対策） */
export function primeAudio(): void {
  getContext();
}

export type BeepKind = "step" | "confirm" | "finish";

const TONES: Record<BeepKind, { frequency: number; duration: number; repeat: number }> = {
  step: { frequency: 880, duration: 0.12, repeat: 1 },
  confirm: { frequency: 660, duration: 0.1, repeat: 2 },
  finish: { frequency: 523.25, duration: 0.22, repeat: 3 },
};

export function playBeep(kind: BeepKind): void {
  const ctx = getContext();
  if (!ctx) return;
  const tone = TONES[kind];
  try {
    for (let i = 0; i < tone.repeat; i++) {
      const startAt = ctx.currentTime + i * (tone.duration + 0.08);
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = tone.frequency;
      // クリックノイズを避けるため、立ち上がりと減衰をつける
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.25, startAt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + tone.duration);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + tone.duration + 0.02);
    }
  } catch {
    /* 音が鳴らなくても抽出は続けられる */
  }
}

const PATTERNS: Record<BeepKind, number | number[]> = {
  step: 120,
  confirm: [80, 60, 80],
  finish: [200, 100, 200, 100, 200],
};

export function vibrate(kind: BeepKind): void {
  try {
    navigator.vibrate?.(PATTERNS[kind]);
  } catch {
    /* 非対応環境では何もしない */
  }
}

export function isVibrationSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}
