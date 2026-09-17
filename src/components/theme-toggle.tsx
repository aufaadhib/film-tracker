"use client";

import { useEffect, useState } from "react";
import { SunIcon } from "@/components/icons";

export type Theme = "system" | "light" | "dark";

const themeEvent = "reelmark-theme-change";

function readTheme(): Theme {
  const saved = localStorage.getItem("reelmark-theme");
  return saved === "light" || saved === "dark" ? saved : "system";
}

function applyTheme(theme: Theme) {
  if (theme === "system") {
    localStorage.removeItem("reelmark-theme");
    delete document.documentElement.dataset.theme;
  } else {
    localStorage.setItem("reelmark-theme", theme);
    document.documentElement.dataset.theme = theme;
  }
  window.dispatchEvent(new Event(themeEvent));
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    const syncTheme = () => setThemeState(readTheme());
    syncTheme();
    window.addEventListener("storage", syncTheme);
    window.addEventListener(themeEvent, syncTheme);
    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener(themeEvent, syncTheme);
    };
  }, []);

  return [theme, applyTheme] as const;
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useTheme();

  function cycleTheme() {
    const next: Theme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
  }

  return (
    <button className={className} type="button" onClick={cycleTheme} aria-label={`Tema ${theme}. Ganti tema`} title={`Tema: ${theme}`}>
      <SunIcon size={18} />
      <span>{theme === "system" ? "Sistem" : theme === "light" ? "Terang" : "Gelap"}</span>
    </button>
  );
}
