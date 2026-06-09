import { useEffect, useState, type ReactNode } from "react";
import { ThemeContext, type Theme } from "./theme-types";
import { setNativeTheme } from "../lib/capacitor";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("maskedon-theme");
    return (stored as Theme) || "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    localStorage.setItem("maskedon-theme", theme);
    // Sync native status bar color with theme
    setNativeTheme(theme);
    // Update the meta theme-color tag for mobile browsers
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#080c15" : "#edf0fa");
  }, [theme]);

  const toggleTheme = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
