import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";

type AppTheme = "light" | "dark";

/**
 * WebView がシステムバーの裏まで描画されているか（Android 15 以降の edge-to-edge）。
 * Capacitor 8 の SystemBars は、このときだけ 0 より大きい --safe-area-inset-* を注入する。
 */
function isDrawnBehindSystemBars(root: HTMLElement): boolean {
  return ["top", "bottom"].some(
    (edge) => parseFloat(root.style.getPropertyValue(`--safe-area-inset-${edge}`)) > 0,
  );
}

/**
 * Android のステータスバー／ナビゲーションバーのアイコン色をアプリのテーマに合わせる。
 *
 * - バーの裏まで描画されている: バーの背景はアプリの背景そのものなので、端末のダークモードではなく
 *   アプリのテーマに合わせる（ライトなら濃いアイコン）
 * - そうでない（Android 14 以下、古い WebView）: バーの背景はネイティブテーマのダークブラウン
 *   （android/app/src/main/res/values/styles.xml）なので、常に明るいアイコンにする
 *
 * Android のネイティブ実行時以外は何もしない。戻り値は監視の解除関数。
 */
export function syncSystemBarsWithTheme(theme: AppTheme): () => void {
  if (Capacitor.getPlatform() !== "android") return () => {};

  const root = document.documentElement;
  let applied: SystemBarsStyle | null = null;

  const apply = () => {
    const style =
      theme === "light" && isDrawnBehindSystemBars(root)
        ? SystemBarsStyle.Light
        : SystemBarsStyle.Dark;
    if (style === applied) return;
    applied = style;
    SystemBars.setStyle({ style }).catch(() => {
      // アイコン色は見た目だけの調整なので、失敗しても抽出の操作は妨げない
    });
  };

  apply();
  // インセットは起動後・画面回転時などに SystemBars が <html> の style へ書き込むので、その変化を追う
  const observer = new MutationObserver(apply);
  observer.observe(root, { attributes: true, attributeFilter: ["style"] });
  return () => observer.disconnect();
}
