import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (!window.location.hash) {
  window.location.hash = "#/";
}

createRoot(document.getElementById("root")!).render(<App />);

/**
 * PWA の Service Worker を登録する。
 * Capacitor（Android の WebView）で動いているときは登録しない
 * — ネイティブ側はアプリ更新で資産が差し替わるため、SW のキャッシュが古い画面を固定してしまう。
 */
const isNativeShell = Boolean(
  (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.(),
);

if (!isNativeShell && "serviceWorker" in navigator) {
  void import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}
