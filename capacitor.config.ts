import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tabear25.brew46",
  appName: "Brew Mate",
  // Vite の build.outDir (vite.config.ts) と一致させる
  webDir: "dist/public",
  plugins: {
    SystemBars: {
      // 起動直後のバーのアイコンは明るい色（既定のダークテーマ・ネイティブのダークブラウンのバーに合わせる）。
      // 以降はアプリのテーマに合わせて client/src/lib/system-bars.ts が切り替える
      style: "DARK",
      // WebView に --safe-area-inset-* を注入させる（client/src/index.css の --inset-* が参照する）
      insetsHandling: "css",
    },
  },
};

export default config;
