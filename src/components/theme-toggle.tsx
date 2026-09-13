"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "agencyos-theme";

/** Reads/writes the `.dark` class on <html>, kept in sync with localStorage.
 *  The actual initial class is set synchronously by the inline script in
 *  the root layout (before paint) — this hook just mirrors that state into
 *  React so components can render the right icon/label. */
export function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function setTheme(next: "light" | "dark") {
    setThemeState(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem(STORAGE_KEY, next);
  }

  return { theme, setTheme };
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  if (!theme) return <div className="h-9" />; // avoid a flash of the wrong icon pre-hydration

  const dark = theme === "dark";
  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}
