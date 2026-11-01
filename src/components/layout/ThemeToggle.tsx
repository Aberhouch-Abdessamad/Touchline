"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { usePreferences } from "@/components/providers/PreferencesProvider";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, hydrated } = usePreferences();
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (!hydrated) return;
    if (theme === "light" || theme === "dark") {
      setResolved(theme);
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setResolved(media.matches ? "dark" : "light");
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [theme, hydrated]);

  const next = resolved === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className={className ?? "icon-button"}
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {resolved === "dark" ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <Moon size={18} aria-hidden="true" />
      )}
    </button>
  );
}
