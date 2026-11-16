import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** 鳴らした音を記録するだけの AudioContext */
class FakeAudioContext {
  state = "running";
  currentTime = 10;
  destination = {};
  starts: { kind: "signal" | "tone"; at: number }[] = [];

  decodeAudioData = vi.fn(async () => ({ duration: 0.5 }) as AudioBuffer);

  createBufferSource() {
    return {
      buffer: null as AudioBuffer | null,
      connect: (target: unknown) => target,
      start: (at: number) => this.starts.push({ kind: "signal", at }),
    };
  }

  createOscillator() {
    return {
      type: "sine",
      frequency: { value: 0 },
      connect: (target: unknown) => target,
      start: (at: number) => this.starts.push({ kind: "tone", at }),
      stop: () => {},
    };
  }

  createGain() {
    return {
      gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: (target: unknown) => target,
    };
  }
}

let ctx: FakeAudioContext;
const fetchMock = vi.fn();

/** モジュール内に読み込み済みの音を持つので、テストごとに読み込み直す */
async function loadFeedback() {
  vi.resetModules();
  return import("@/lib/feedback");
}

/** fetch → デコード → 保持までの Promise を進める */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("ステップ切り替え音", () => {
  beforeEach(() => {
    ctx = new FakeAudioContext();
    vi.stubGlobal(
      "AudioContext",
      vi.fn(() => ctx),
    );
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("読み込み済みなら合図の音を鳴らす（切り替え 1 回・状態の確認 2 回・完了 3 回）", async () => {
    const { primeAudio, playBeep } = await loadFeedback();
    primeAudio();
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toMatch(/team-radio.*\.wav$/);

    playBeep("step");
    playBeep("confirm");
    playBeep("finish");
    expect(ctx.starts.every((s) => s.kind === "signal")).toBe(true);
    expect(ctx.starts).toHaveLength(1 + 2 + 3);
  });

  it("繰り返すときは前の音が終わってから鳴らす", async () => {
    const { primeAudio, playBeep } = await loadFeedback();
    primeAudio();
    await flush();

    playBeep("finish");
    expect(ctx.starts.map((s) => s.at)).toEqual(
      [10, 10.58, 11.16].map((at) => expect.closeTo(at, 5)),
    );
  });

  it("読み込みが済む前は合成音で代用し、その間に読み込む", async () => {
    const { playBeep } = await loadFeedback();
    playBeep("step");
    expect(ctx.starts).toEqual([{ kind: "tone", at: 10 }]);

    await flush();
    playBeep("step");
    expect(ctx.starts.at(-1)?.kind).toBe("signal");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("読み込みに失敗したら合成音で鳴らし、次の機会に読み込み直す", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    const { primeAudio, playBeep } = await loadFeedback();
    primeAudio();
    await flush();

    playBeep("confirm");
    expect(ctx.starts.map((s) => s.kind)).toEqual(["tone", "tone"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await flush();
    playBeep("step");
    expect(ctx.starts.at(-1)?.kind).toBe("signal");
  });

  it("Web Audio に対応していない環境では何もしない", async () => {
    vi.stubGlobal("AudioContext", undefined);
    const { primeAudio, playBeep } = await loadFeedback();
    primeAudio();
    playBeep("step");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(ctx.starts).toHaveLength(0);
  });
});
