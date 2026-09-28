import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syncSystemBarsWithTheme } from "@/lib/system-bars";

const mocks = vi.hoisted(() => ({
  platform: "android",
  setStyle: vi.fn(() => Promise.resolve()),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => mocks.platform },
  SystemBars: { setStyle: mocks.setStyle },
  SystemBarsStyle: { Dark: "DARK", Light: "LIGHT", Default: "DEFAULT" },
}));

/** Capacitor の SystemBars が <html> に書き込むのと同じ形でインセットを注入する */
function injectInsets(top: number, bottom: number) {
  const style = document.documentElement.style;
  style.setProperty("--safe-area-inset-top", `${top}px`);
  style.setProperty("--safe-area-inset-bottom", `${bottom}px`);
}

/** MutationObserver のコールバックを走らせる */
const flushMutations = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("syncSystemBarsWithTheme", () => {
  let stop: () => void = () => {};

  beforeEach(() => {
    mocks.platform = "android";
    mocks.setStyle.mockClear();
    document.documentElement.removeAttribute("style");
  });

  afterEach(() => stop());

  it("Android 以外では何もしない", () => {
    mocks.platform = "web";
    stop = syncSystemBarsWithTheme("light");
    expect(mocks.setStyle).not.toHaveBeenCalled();
  });

  it("ダークテーマでは明るいアイコンにする", () => {
    injectInsets(32, 24);
    stop = syncSystemBarsWithTheme("dark");
    expect(mocks.setStyle).toHaveBeenCalledExactlyOnceWith({ style: "DARK" });
  });

  it("ライトテーマでもバーの裏まで描画していなければ明るいアイコンのまま（バーはダークブラウン）", () => {
    injectInsets(0, 0);
    stop = syncSystemBarsWithTheme("light");
    expect(mocks.setStyle).toHaveBeenCalledExactlyOnceWith({ style: "DARK" });
  });

  it("ライトテーマでバーの裏まで描画しているなら濃いアイコンにする（インセットが後から届いても追従する）", async () => {
    stop = syncSystemBarsWithTheme("light");
    expect(mocks.setStyle).toHaveBeenLastCalledWith({ style: "DARK" });

    injectInsets(32, 24);
    await flushMutations();
    expect(mocks.setStyle).toHaveBeenLastCalledWith({ style: "LIGHT" });
    expect(mocks.setStyle).toHaveBeenCalledTimes(2);
  });

  it("同じ見た目のままなら何度も設定し直さない", async () => {
    injectInsets(32, 24);
    stop = syncSystemBarsWithTheme("light");
    document.documentElement.style.colorScheme = "light";
    await flushMutations();
    expect(mocks.setStyle).toHaveBeenCalledTimes(1);
  });

  it("解除後はインセットの変化を追わない", async () => {
    syncSystemBarsWithTheme("light")();
    injectInsets(32, 24);
    await flushMutations();
    expect(mocks.setStyle).toHaveBeenCalledExactlyOnceWith({ style: "DARK" });
  });
});
