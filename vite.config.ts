import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

const THEME_COLOR = "#1f1814"; // ダークテーマの背景（温かみのあるダークブラウン）

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Service Worker の登録は main.tsx 側で行う（Capacitor の WebView では登録しない）
      injectRegister: null,
      includeAssets: ["icons/*.png"],
      manifest: {
        name: "Brew Mate — ハンドドリップ抽出シーケンサー",
        short_name: "Brew Mate",
        description:
          "豆量からレシピの注湯手順を自動計算し、タイマーで案内するハンドドリップ抽出シーケンサー。",
        lang: "ja",
        start_url: "./",
        scope: "./",
        display: "standalone",
        orientation: "portrait",
        background_color: THEME_COLOR,
        theme_color: THEME_COLOR,
        categories: ["food", "lifestyle", "utilities"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2}"],
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html",
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  base: "./",
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
