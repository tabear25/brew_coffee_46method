import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tabear25.brew46",
  appName: "Brew Mate",
  // Vite の build.outDir (vite.config.ts) と一致させる
  webDir: "dist/public",
};

export default config;
