"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Target,
  FolderCog,
  Plus,
  BookOpen,
} from "lucide-react";
import { AccountMenu } from "@/components/layout/account-menu";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { useMoneyData } from "@/components/money-data-provider";
import type { Transaction, TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TransactionModalContextValue {
  openNewTransaction: (defaultType?: TransactionType) => void;
  openEditTransaction: (tx: Transaction) => void;
}

const TransactionModalContext = createContext<TransactionModalContextValue>({
  openNewTransaction: () => {},
  openEditTransaction: () => {},
});

export function useTransactionModal() {
  return useContext(TransactionModalContext);
}

const SIDEBAR_STORAGE_KEY = "money-tracker-sidebar-collapsed";
const sidebarListeners = new Set<() => void>();

function subscribeSidebar(callback: () => void) {
  sidebarListeners.add(callback);
  return () => {
    sidebarListeners.delete(callback);
  };
}

function getSidebarCollapsedSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function setSidebarCollapsedPreference(collapsed: boolean) {
  if (typeof document !== "undefined") {
    if (collapsed) {
      document.documentElement.dataset.sidebar = "collapsed";
    } else {
      delete document.documentElement.dataset.sidebar;
    }
  }
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  } catch {
    // Ignore storage errors in restricted browsing modes.
  }
  for (const listener of sidebarListeners) {
    listener();
  }
}

const NAV_GROUPS = [
  {
    groupLabel: "Buku Kas",
    items: [
      {
        href: "/",
        label: "Ringkasan",
        shortLabel: "Ringkasan",
        icon: LayoutDashboard,
      },
      {
        href: "/transactions",
        label: "Riwayat Transaksi",
        shortLabel: "Transaksi",
        icon: ArrowLeftRight,
      },
    ],
  },
  {
    groupLabel: "Perencanaan & Evaluasi",
    items: [
      {
        href: "/budgets",
        label: "Anggaran Bulanan",
        shortLabel: "Anggaran",
        icon: Target,
      },
      {
        href: "/reports",
        label: "Laporan & Analisis",
        shortLabel: "Laporan",
        icon: PieChart,
      },
    ],
  },
  {
    groupLabel: "Pengaturan",
    items: [
      {
        href: "/settings",
        label: "Kategori & Data CSV",
        shortLabel: "Data",
        icon: FolderCog,
      },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useMoneyData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [defaultType, setDefaultType] = useState<TransactionType>("expense");

  const isCollapsed = useSyncExternalStore(
    subscribeSidebar,
    getSidebarCollapsedSnapshot,
    () => false
  );

  useEffect(() => {
    if (isCollapsed) {
      document.documentElement.dataset.sidebar = "collapsed";
    } else {
      delete document.documentElement.dataset.sidebar;
    }
  }, [isCollapsed]);

  const openNewTransaction = useCallback((type: TransactionType = "expense") => {
    setEditingTx(null);
    setDefaultType(type);
    setDialogOpen(true);
  }, []);

  const openEditTransaction = useCallback((tx: Transaction) => {
    setEditingTx(tx);
    setDefaultType(tx.type);
    setDialogOpen(true);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsedPreference(!isCollapsed);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  // Render clean standalone layout on /login
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <TransactionModalContext.Provider
      value={{ openNewTransaction, openEditTransaction }}
    >
      <div className="flex min-h-dvh flex-col bg-[var(--bg-page)] text-[var(--text-primary)] lg:flex-row">
        {/* Skip link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--accent-primary)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--accent-primary-fg)]"
        >
          Lewati ke konten utama
        </a>

        {/* Desktop Left Navigation Rail (Collapsible 256px <-> 72px with pre-paint CSS sync) */}
        <aside
          aria-label="Navigasi utama desktop"
          className={cn(
            "app-desktop-sidebar hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:flex-col lg:border-r lg:border-[var(--border-color)] lg:bg-[var(--bg-surface)]",
            isCollapsed ? "lg:w-[72px]" : "lg:w-64"
          )}
        >
          {/* Sidebar Header */}
          <div
            className={cn(
              "sidebar-center-when-collapsed flex h-16 items-center border-b border-dashed border-[var(--border-color)]",
              isCollapsed ? "justify-center px-2" : "justify-between px-4"
            )}
          >
            <Link
              href="/"
              title="Money Tracker (IDR)"
              className="flex items-center gap-2.5 text-base font-bold tracking-tight text-[var(--text-primary)]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
              </span>
              <span
                className={cn(
                  "sidebar-expanded-only truncate",
                  isCollapsed && "hidden"
                )}
              >
                Money Tracker
              </span>
            </Link>

            <span
              className={cn(
                "sidebar-expanded-only rounded border border-[var(--border-color)] bg-[var(--bg-page)] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[var(--text-secondary)]",
                isCollapsed && "hidden"
              )}
            >
              IDR
            </span>
          </div>

          {/* Primary Action Button */}
          <div
            className={cn(
              "sidebar-center-when-collapsed flex p-3",
              isCollapsed ? "justify-center" : "px-4 py-3"
            )}
          >
            <button
              type="button"
              onClick={() => openNewTransaction("expense")}
              aria-label="Catat Transaksi"
              title="Catat Transaksi"
              className={cn(
                "sidebar-cta-btn flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] text-sm font-semibold text-[var(--accent-primary-fg)] shadow-sm transition-colors hover:bg-[var(--accent-primary-hover)] active:translate-y-[1px]",
                isCollapsed ? "w-11 px-0" : "w-full px-4 py-2"
              )}
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span
                className={cn(
                  "sidebar-expanded-only truncate",
                  isCollapsed && "hidden"
                )}
              >
                Catat Transaksi
              </span>
            </button>
          </div>

          {/* Navigation Destinations with subtle themed scrollbar & bottom fade cue */}
          <div className="relative flex-1 min-h-0">
            <nav
              aria-label="Menu halaman"
              className={cn(
                "sidebar-scroll h-full overflow-y-auto pb-5 pt-1",
                isCollapsed ? "space-y-2.5 px-2" : "space-y-3.5 px-3"
              )}
            >
              {NAV_GROUPS.map((group) => (
                <div key={group.groupLabel}>
                  <p
                    className={cn(
                      "sidebar-expanded-only mb-1 px-2.5 text-[10px] font-semibold tracking-wider text-[var(--text-secondary)] uppercase",
                      isCollapsed && "hidden"
                    )}
                  >
                    {group.groupLabel}
                  </p>
                  <div
                    className={cn(
                      "sidebar-collapsed-only mx-auto my-1.5 h-px w-6 bg-[var(--border-color)]",
                      !isCollapsed && "hidden"
                    )}
                    aria-hidden="true"
                  />
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        item.href === "/"
                          ? pathname === "/"
                          : pathname.startsWith(item.href);

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={isActive ? "page" : undefined}
                            aria-label={isCollapsed ? item.label : undefined}
                            title={item.label}
                            className={cn(
                              "sidebar-center-when-collapsed flex min-h-[40px] items-center rounded-lg text-sm transition-colors",
                              isCollapsed
                                ? "justify-center px-0 py-2"
                                : "gap-3 px-3 py-1.5",
                              isActive
                                ? "border border-[var(--border-color)] bg-[var(--bg-subtle)] font-semibold text-[var(--text-primary)]"
                                : "font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-4 w-4 shrink-0",
                                isActive
                                  ? "text-[var(--accent-primary)]"
                                  : "text-[var(--text-secondary)]"
                              )}
                              aria-hidden="true"
                            />
                            <span
                              className={cn(
                                "sidebar-expanded-only truncate",
                                isCollapsed && "hidden"
                              )}
                            >
                              {item.label}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
            {/* Subtle gradient fade at bottom edge of nav scroll area */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-[var(--bg-surface)] to-transparent"
            />
          </div>

          {/* Compact Sidebar Footer: Single Account Dropdown Trigger (Contains Profile, Theme, Sidebar Collapse & Logout) */}
          <div className="border-t border-dashed border-[var(--border-color)] p-2.5">
            {/* Expanded footer state */}
            <div
              className={cn(
                "sidebar-expanded-only",
                isCollapsed && "hidden"
              )}
            >
              <AccountMenu
                user={user}
                variant="desktop-expanded"
                isSidebarCollapsed={isCollapsed}
                onToggleSidebar={toggleSidebar}
                onLogout={handleLogout}
              />
            </div>

            {/* Collapsed footer state */}
            <div
              className={cn(
                "sidebar-collapsed-only flex justify-center",
                !isCollapsed && "hidden"
              )}
            >
              <AccountMenu
                user={user}
                variant="desktop-collapsed"
                isSidebarCollapsed={isCollapsed}
                onToggleSidebar={toggleSidebar}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </aside>

        {/* Mobile & Tablet Compact Top Bar (Logo + Quick Add + Single Account Avatar Dropdown) */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-3.5 sm:px-4 lg:hidden">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="truncate">Money Tracker</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openNewTransaction("expense")}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-primary-fg)] shadow-sm hover:bg-[var(--accent-primary-hover)]"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Catat Transaksi</span>
            </button>
            <AccountMenu
              user={user}
              variant="mobile"
              onLogout={handleLogout}
            />
          </div>
        </header>

        {/* Main Workspace Container */}
        <div
          className={cn(
            "app-main-wrapper flex flex-1 flex-col",
            isCollapsed ? "lg:pl-[72px]" : "lg:pl-64"
          )}
        >
          <main
            id="main-content"
            className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8"
          >
            {children}
          </main>

          <footer className="hidden border-t border-dashed border-[var(--border-color)] px-8 py-4 text-xs text-[var(--text-secondary)] lg:block">
            <div className="mx-auto flex max-w-6xl items-center justify-between">
              <span className="font-medium text-[var(--text-primary)]">Money Tracker</span>
              <span className="font-mono">Mata Uang: Rupiah (IDR)</span>
            </div>
          </footer>
        </div>

        {/* Mobile & Tablet Bottom Navigation Bar */}
        <nav
          aria-label="Navigasi bawah perangkat mobile"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-color)] bg-[var(--bg-surface)] px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <ul className="mx-auto grid max-w-md grid-cols-5 items-center gap-1 py-1">
            {[
              NAV_GROUPS[0].items[0],
              NAV_GROUPS[0].items[1],
              NAV_GROUPS[1].items[0],
              NAV_GROUPS[1].items[1],
              NAV_GROUPS[2].items[0],
            ].map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[11px] transition-colors",
                      isActive
                        ? "border border-[var(--border-color)] bg-[var(--bg-subtle)] font-semibold text-[var(--text-primary)]"
                        : "font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        isActive
                          ? "text-[var(--accent-primary)]"
                          : "text-[var(--text-secondary)]"
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.shortLabel}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <TransactionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingTransaction={editingTx}
          defaultType={defaultType}
        />
      </div>
    </TransactionModalContext.Provider>
  );
}
