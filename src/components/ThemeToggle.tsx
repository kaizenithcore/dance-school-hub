import { Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { getStoredTheme, setTheme, resolveEffectiveTheme, type AppTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
}

export function ThemeToggle({ className, size = "md" }: ThemeToggleProps) {
  const [current, setCurrent] = useState<AppTheme>(() => getStoredTheme());
  const isDark = resolveEffectiveTheme(current) === "dark";

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (getStoredTheme() === "system") setCurrent("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggle = () => {
    const next: AppTheme = isDark ? "light" : "dark";
    setTheme(next);
    setCurrent(next);
  };

  const iconSize = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className={cn(
        "relative inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        className,
      )}
    >
      <Sun
        className={cn(
          iconSize,
          "absolute transition-all duration-300",
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
        )}
      />
      <Moon
        className={cn(
          iconSize,
          "absolute transition-all duration-300",
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0",
        )}
      />
    </button>
  );
}
