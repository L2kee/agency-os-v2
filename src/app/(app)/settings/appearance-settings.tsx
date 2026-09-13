"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-toggle";

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="glass-card rounded-xl p-5">
      <h2 className="font-semibold">Appearance</h2>
      <p className="mt-1 text-sm text-slate-500">Light or dark — your pick, per device.</p>

      <div className="mt-4 inline-flex rounded-lg border border-slate-200 p-1">
        <button
          onClick={() => setTheme("light")}
          disabled={!theme}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            theme === "light" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Sun size={16} /> Light
        </button>
        <button
          onClick={() => setTheme("dark")}
          disabled={!theme}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            theme === "dark" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Moon size={16} /> Dark
        </button>
      </div>
    </div>
  );
}
