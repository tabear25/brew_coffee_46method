import { Coffee, Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "@/components/recipe/settings-dialog";

/**
 * モバイルファーストの外枠。コンテンツ幅は 600px までに制限する。
 *
 * Android 15 以降（edge-to-edge）や iOS の PWA では画面がステータスバーの裏まで広がるため、
 * ヘッダーは半透明の背景をステータスバーの裏まで伸ばし、中身はその下から始める。
 * 横向きのカットアウトは左右の余白で避ける（index.css の --inset-*）。
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-[100dvh] bg-background pl-[var(--inset-left)] pr-[var(--inset-right)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-[calc(var(--inset-top)+1rem)] focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        本文へスキップ
      </a>

      <header className="sticky top-0 z-50 chrome-material scroll-edge pt-[var(--inset-top)]">
        <div className="mx-auto flex h-14 max-w-[600px] items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Coffee className="h-4 w-4 text-primary-foreground" aria-hidden />
            </div>
            <span className="text-sm font-semibold tracking-[-0.01em]">Brew Mate</span>
          </div>

          <div className="flex items-center gap-1">
            <SettingsDialog
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 w-11 p-0"
                  aria-label="設定を開く"
                  data-testid="open-settings"
                >
                  <Settings className="h-4 w-4" aria-hidden />
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-11 w-11 p-0"
              data-testid="theme-toggle"
              aria-label={
                theme === "dark" ? "ライトテーマに切り替える" : "ダークテーマに切り替える"
              }
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" aria-hidden />
              ) : (
                <Moon className="h-4 w-4" aria-hidden />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* 最下部の内容はナビゲーションバー（iOS はホームインジケータ）の上で終わらせる */}
      <main
        id="main"
        className="mx-auto max-w-[600px] px-4 pb-[calc(var(--inset-bottom)+6rem)] pt-5"
      >
        {children}
      </main>
    </div>
  );
}
