import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/**
 * @testing-library/react は擬似タイマーの有無を `global.jest` 経由で判定する。
 * vitest には `jest` グローバルが無いため、asyncWrapper 内の setTimeout(0) が
 * 永久に解決せずテストがハングする。最小限の橋渡しを入れておく。
 */
(globalThis as unknown as { jest: unknown }).jest = {
  advanceTimersByTime: (ms: number) => {
    if (vi.isFakeTimers()) vi.advanceTimersByTime(ms);
  },
};

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

// jsdom は matchMedia / Wake Lock / Vibration API を実装していないため、最小限のスタブを置く
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

// Radix のスライダー / ダイアログが使う API のスタブ
const globalWithObservers = globalThis as unknown as { ResizeObserver?: typeof ResizeObserver };
globalWithObservers.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

if (!window.HTMLElement.prototype.hasPointerCapture) {
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
}
