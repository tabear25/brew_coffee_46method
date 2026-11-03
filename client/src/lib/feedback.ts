/**
 * ステップ切り替え時の音・バイブレーション。
 * 非対応ブラウザでは静かに何もしない（アプリ本体は動き続ける）。
 */

import teamRadioUrl from "@/assets/sounds/team-radio.wav";

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

/**
 * 合図の音（F1 のチームラジオ風の電子音）。再生の遅れが出ないよう、先に読み込んでデコードしておく。
 * 読み込みが済むまでと失敗したときは、下の合成音で代用する。
 */
let signalBuffer: AudioBuffer | null = null;
let signalLoading: Promise<void> | null = null;

function loadSignal(ctx: AudioContext): void {
  if (signalBuffer) return;
  signalLoading ??= fetch(teamRadioUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.arrayBuffer();
    })
    .then((data) => ctx.decodeAudioData(data))
    .then((buffer) => {
      signalBuffer = buffer;
    })
    .catch(() => {
      // 次に鳴らすときにもう一度読み込む
      signalLoading = null;
    });
}

/** 最初のユーザー操作で AudioContext を起こし、合図の音を読み込んでおく（iOS 対策） */
export function primeAudio(): void {
  const ctx = getContext();
  if (ctx) loadSignal(ctx);
}

export type BeepKind = "step" | "confirm" | "finish";

/** 鳴らす回数で合図の種類を聞き分けられるようにする（切り替え 1 回・状態の確認 2 回・完了 3 回） */
const REPEATS: Record<BeepKind, number> = { step: 1, confirm: 2, finish: 3 };
/** 繰り返すときの間隔（秒） */
const REPEAT_GAP = 0.08;

const TONES: Record<BeepKind, { frequency: number; duration: number }> = {
  step: { frequency: 880, duration: 0.12 },
  confirm: { frequency: 660, duration: 0.1 },
  finish: { frequency: 523.25, duration: 0.22 },
};

export function playBeep(kind: BeepKind): void {
  const ctx = getContext();
  if (!ctx) return;
  loadSignal(ctx);
  if (signalBuffer) playSignal(ctx, signalBuffer, REPEATS[kind]);
  else playTone(ctx, kind);
}

function playSignal(ctx: AudioContext, buffer: AudioBuffer, repeat: number): void {
  try {
    for (let i = 0; i < repeat; i++) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(ctx.currentTime + i * (buffer.duration + REPEAT_GAP));
    }
  } catch {
    /* 音が鳴らなくても抽出は続けられる */
  }
}

function playTone(ctx: AudioContext, kind: BeepKind): void {
  const tone = { ...TONES[kind], repeat: REPEATS[kind] };
  try {
    for (let i = 0; i < tone.repeat; i++) {
      const startAt = ctx.currentTime + i * (tone.duration + REPEAT_GAP);
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
