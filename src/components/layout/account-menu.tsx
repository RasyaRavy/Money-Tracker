"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  ChevronUp,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  User as UserIcon,
} from "lucide-react";
import type { AuthUserInfo } from "@/components/money-data-provider";
import { useHydrated } from "@/lib/use-client-date";
import { cn } from "@/lib/utils";

interface AccountMenuProps {
  user: AuthUserInfo | null;
  variant: "desktop-expanded" | "desktop-collapsed" | "mobile";
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onLogout: () => Promise<void>;
}

function getInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || "U").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function AccountMenu({
  user,
  variant,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onLogout,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHydrated();

  const isDark = mounted && resolvedTheme === "dark";
  const initials = getInitials(user?.name, user?.email);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleThemeToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const handleSidebarToggle = () => {
    onToggleSidebar?.();
    setOpen(false);
  };

  const handleLogoutClick = async () => {
    setOpen(false);
    await onLogout();
  };

  const isDesktop = variant !== "mobile";

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      {variant === "desktop-expanded" ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Menu akun dan pengaturan tampilan"
          className={cn(
            "flex min-h-[48px] w-full items-center justify-between gap-2.5 rounded-lg border bg-[var(--bg-page)] px-2.5 py-2 text-left transition-colors hover:bg-[var(--bg-subtle)]",
            open
              ? "border-[var(--text-primary)]/40 bg-[var(--bg-subtle)]"
              : "border-[var(--border-color)]"
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] font-mono text-xs font-bold text-[var(--accent-primary-fg)]">
              {user ? initials : <UserIcon className="h-4 w-4" aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p
                title={user?.name ?? "Akun"}
                className="truncate text-xs font-semibold text-[var(--text-primary)]"
              >
                {user?.name ?? "Akun Pengguna"}
              </p>
              <p
                title={user?.email ?? ""}
                className="truncate text-[11px] text-[var(--text-secondary)]"
              >
                {user?.email ?? "Pengaturan & Tema"}
              </p>
            </div>
          </div>
          <ChevronUp
            className={cn(
              "h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Menu akun dan pengaturan tampilan"
          title={user ? `${user.name} (${user.email})` : "Menu akun"}
          className={cn(
            "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border transition-colors",
            open
              ? "border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/30"
              : "border-[var(--border-color)] hover:border-[var(--text-secondary)]",
            "bg-[var(--bg-page)]"
          )}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-primary)] font-mono text-xs font-bold text-[var(--accent-primary-fg)]">
            {user ? initials : <UserIcon className="h-4 w-4" aria-hidden="true" />}
          </span>
        </button>
      )}

      {/* Dropdown Popover */}
      {open && (
        <div
          role="menu"
          aria-label="Pengaturan akun dan tampilan"
          className={cn(
            "z-50 w-60 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-1.5 shadow-lg",
            variant === "desktop-expanded" &&
              "absolute bottom-[calc(100%+8px)] left-0 right-0 w-full",
            variant === "desktop-collapsed" &&
              "absolute bottom-0 left-[calc(100%+10px)]",
            variant === "mobile" && "absolute right-0 top-[calc(100%+8px)]"
          )}
        >
          {/* User Identity Header */}
          {user && (
            <div className="mb-1 border-b border-dashed border-[var(--border-color)] px-2.5 py-2">
              <p
                title={user.name}
                className="truncate text-xs font-semibold text-[var(--text-primary)]"
              >
                {user.name}
              </p>
              <p
                title={user.email}
                className="truncate text-[11px] text-[var(--text-secondary)]"
              >
                {user.email}
              </p>
            </div>
          )}

          {/* Theme Switch Item */}
          <button
            type="button"
            role="menuitem"
            onClick={handleThemeToggle}
            className="flex min-h-[40px] w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            <span className="inline-flex items-center gap-2.5">
              {isDark ? (
                <Sun
                  className="h-4 w-4 shrink-0 text-amber-400"
                  aria-hidden="true"
                />
              ) : (
                <Moon
                  className="h-4 w-4 shrink-0 text-zinc-700"
                  aria-hidden="true"
                />
              )}
              <span>Tema: {isDark ? "Gelap" : "Terang"}</span>
            </span>
            <span className="rounded bg-[var(--bg-page)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
              Ganti
            </span>
          </button>

          {/* Desktop Sidebar Collapse Toggle */}
          {isDesktop && onToggleSidebar && (
            <button
              type="button"
              role="menuitem"
              onClick={handleSidebarToggle}
              className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
            >
              {isSidebarCollapsed ? (
                <>
                  <PanelLeftOpen
                    className="h-4 w-4 shrink-0 text-[var(--text-secondary)]"
                    aria-hidden="true"
                  />
                  <span>Perluas Sidebar</span>
                </>
              ) : (
                <>
                  <PanelLeftClose
                    className="h-4 w-4 shrink-0 text-[var(--text-secondary)]"
                    aria-hidden="true"
                  />
                  <span>Lipat Sidebar</span>
                </>
              )}
            </button>
          )}

          {/* Logout Item */}
          {user && (
            <>
              <div className="my-1 border-t border-dashed border-[var(--border-color)]" />
              <button
                type="button"
                role="menuitem"
                onClick={handleLogoutClick}
                className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-[var(--color-expense)] transition-colors hover:bg-[var(--color-expense-bg)]"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Keluar dari Akun</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
