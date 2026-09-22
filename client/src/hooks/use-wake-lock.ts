import { useEffect, useRef, useState } from "react";

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
}

interface WakeLockNavigator {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
}

export function isWakeLockSupported(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

/**
 * Screen Wake Lock API。抽出中に画面が消えないようにする。
 * 非対応ブラウザでは何もしない（アプリ本体はそのまま動く）。
 */
export function useWakeLock(active: boolean): { supported: boolean; held: boolean } {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const [held, setHeld] = useState(false);
  const supported = isWakeLockSupported();

  useEffect(() => {
    if (!supported || !active) return;
    let cancelled = false;

    const request = async () => {
      try {
        const wakeLock = (navigator as WakeLockNavigator).wakeLock;
        if (!wakeLock) return;
        const sentinel = await wakeLock.request("screen");
        if (cancelled) {
          void sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
        setHeld(true);
        sentinel.addEventListener("release", () => setHeld(false));
      } catch {
        setHeld(false);
      }
    };

    void request();

    // タブが再表示されたら取り直す（ブラウザが自動解放するため）
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !sentinelRef.current?.released) return;
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      setHeld(false);
      if (sentinel && !sentinel.released) void sentinel.release().catch(() => {});
    };
  }, [active, supported]);

  return { supported, held };
}
