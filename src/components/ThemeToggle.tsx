import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { getTheme, subscribeTheme, toggleTheme } from "../lib/theme";

export function useTheme() {
  return useSyncExternalStore(subscribeTheme, getTheme, () => "light" as const);
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      aria-label={t("themeToggle")}
      title={isDark ? t("themeLight") : t("themeDark")}
      onClick={toggleTheme}
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M5 5l1.4 1.4M17.6 17.6 19 19M3 12h2M19 12h2M5 19l1.4-1.4M17.6 6.4 19 5" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z" />
        </svg>
      )}
    </button>
  );
}
