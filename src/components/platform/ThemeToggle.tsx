import { useEffect, useState } from "react";
import { progressStore, type ThemeMode } from "@/stores/progressStore";

export interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => {
      const resolved = progressStore.applyThemeToDocument();
      setTheme(resolved);
    };
    sync();
    setHydrated(true);
    return progressStore.subscribe(sync);
  }, []);

  const isDark = theme === "dark";
  const nextLabel = isDark ? "Tema claro" : "Tema oscuro";
  const ariaLabel = isDark
    ? "Cambiar a tema claro"
    : "Cambiar a tema oscuro";

  return (
    <button
      type="button"
      className={`btn btn-ghost ${className}`.trim()}
      onClick={() => {
        const next = progressStore.toggleTheme();
        setTheme(next);
      }}
      aria-pressed={hydrated ? isDark : false}
      aria-label={ariaLabel}
      data-testid="theme-toggle"
    >
      <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
      <span>{nextLabel}</span>
    </button>
  );
}

export default ThemeToggle;
