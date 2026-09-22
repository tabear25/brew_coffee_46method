import { createContext, useContext, useEffect, useState } from "react";
import { readJson, writeJson } from "@/lib/storage";

type Theme = "light" | "dark";

const THEME_KEY = "brew-mate:theme:v1";

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({
  theme: "dark",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // ダークテーマが既定。ユーザーが切り替えたらその選択を覚える
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = readJson<Theme>(THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    writeJson(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    // ダーク↔ライトの明度ジャンプを和らげる（index.css の .theme-transitioning）
    const root = document.documentElement;
    root.classList.add("theme-transitioning");
    window.setTimeout(() => root.classList.remove("theme-transitioning"), 400);
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
