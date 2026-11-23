"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useHydrated } from "@/lib/use-client-date";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  compact?: boolean;
  iconOnly?: boolean;
  className?: string;
}

export function ThemeToggle({
  compact = false,
  iconOnly = false,
  className,
}: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHydrated();

  if (!mounted) {
    return (
      <div
        className={cn(
          "h-10 rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)]",
          compact ? "w-full" : "w-11 h-11",
          className
        )}
        aria-hidden="true"
      />
    );
  }

  const isDark = resolvedTheme === "dark";
  const nextModeLabel = isDark
    ? "Ganti ke tampilan terang"
    : "Ganti ke tampilan gelap";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={nextModeLabel}
      title={nextModeLabel}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] active:bg-[var(--border-subtle)]",
        iconOnly
          ? "min-h-[44px] w-11 px-0"
          : compact
          ? "min-h-[40px] w-full px-2.5 py-1.5"
          : "min-h-[44px] min-w-[44px] px-3 py-2",
        className
      )}
    >
      {isDark ? (
        <>
          <Sun className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
          {!iconOnly && <span>Tema: Gelap</span>}
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5 shrink-0 text-zinc-700" aria-hidden="true" />
          {!iconOnly && <span>Tema: Terang</span>}
        </>
      )}
    </button>
  );
}
