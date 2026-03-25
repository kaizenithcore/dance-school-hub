const THEME_STORAGE_KEY = "dancehub.theme";

export type AppTheme = "light" | "dark" | "system";

export function getStoredTheme(): AppTheme {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }

  return "system";
}

export function resolveEffectiveTheme(theme: AppTheme): "light" | "dark" {
  if (theme !== "system") {
    return theme;
  }

  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: AppTheme): void {
  if (typeof document === "undefined") {
    return;
  }

  const effective = resolveEffectiveTheme(theme);
  document.documentElement.classList.toggle("dark", effective === "dark");
}

export function setTheme(theme: AppTheme): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
  applyTheme(theme);
}

export function initializeTheme(): AppTheme {
  const stored = getStoredTheme();
  // Default to light if no preference stored
  const theme = stored === "system" ? "light" as AppTheme : stored;
  if (stored === "system") {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
  }
  applyTheme(theme);

  if (typeof window !== "undefined") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getStoredTheme() === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", onChange);
  }

  return theme;
}
