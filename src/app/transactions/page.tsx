"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Download,
} from "lucide-react";
import { useMoneyData } from "@/components/money-data-provider";
import {
  formatDateLong,
  formatIDR,
  formatSignedIDR,
} from "@/lib/format";
import { useClientDateInfo } from "@/lib/use-client-date";
import { exportTransactionsToCSV } from "@/lib/csv";
import type { Category, Transaction } from "@/lib/types";
import { useTransactionModal } from "@/components/layout/app-shell";
import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/utils";

type SortMode = "newest" | "oldest" | "highest" | "lowest";

export default function TransactionsPage() {
  const { openNewTransaction, openEditTransaction } = useTransactionModal();
  const { categories, transactions, isLoading, deleteTransaction } = useMoneyData();
  const { currentMonthISO } = useClientDateInfo();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [customMonth, setCustomMonth] = useState<string | null>(null);
  const [showAllMonths, setShowAllMonths] = useState<boolean>(false);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filterMonth = customMonth ?? currentMonthISO;

  const categoriesMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) {
      map.set(c.id, c);
    }
    return map;
  }, [categories]);

  const availableCategories = useMemo(() => {
    if (filterType === "all") return categories;
    return categories.filter((c) => c.type === filterType);
  }, [categories, filterType]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = transactions.filter((tx) => {
      if (!showAllMonths && filterMonth && !tx.date.startsWith(filterMonth)) {
        return false;
      }
      if (filterType !== "all" && tx.type !== filterType) {
        return false;
      }
      if (filterCategoryId !== "all" && tx.categoryId !== filterCategoryId) {
        return false;
      }
      if (q.length > 0) {
        const catName = categoriesMap.get(tx.categoryId)?.name.toLowerCase() ?? "";
        const noteText = tx.note.toLowerCase();
        const amountStr = String(tx.amount);
        if (!catName.includes(q) && !noteText.includes(q) && !amountStr.includes(q)) {
          return false;
        }
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (sortMode === "newest") {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.createdAt - a.createdAt;
      }
      if (sortMode === "oldest") {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.createdAt - b.createdAt;
      }
      if (sortMode === "highest") {
        return b.amount - a.amount;
      }
      return a.amount - b.amount;
    });

    return filtered;
  }, [
    transactions,
    searchQuery,
    showAllMonths,
    filterMonth,
    filterType,
    filterCategoryId,
    sortMode,
    categoriesMap,
  ]);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === "income") income += tx.amount;
      else expense += tx.amount;
    }
    return {
      income,
      expense,
      net: income - expense,
    };
  }, [filteredTransactions]);

  const groupedByDate = useMemo(() => {
    const groups: {
      date: string;
      dayIncome: number;
      dayExpense: number;
      items: Transaction[];
    }[] = [];

    const map = new Map<string, (typeof groups)[number]>();

    for (const tx of filteredTransactions) {
      let grp = map.get(tx.date);
      if (!grp) {
        grp = { date: tx.date, dayIncome: 0, dayExpense: 0, items: [] };
        map.set(tx.date, grp);
        groups.push(grp);
      }
      grp.items.push(tx);
      if (tx.type === "income") grp.dayIncome += tx.amount;
      else grp.dayExpense += tx.amount;
    }

    return groups;
  }, [filteredTransactions]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterType("all");
    setFilterCategoryId("all");
    setCustomMonth(null);
    setShowAllMonths(false);
    setSortMode("newest");
  };

  const handleDelete = async (id: string) => {
    await deleteTransaction(id);
    setDeletingId(null);
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    filterType !== "all" ||
    filterCategoryId !== "all" ||
    showAllMonths ||
    sortMode !== "newest";

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6"
      >
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          Memuat riwayat transaksi dari PostgreSQL...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Riwayat Transaksi
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Cari, filter, edit, atau ekspor catatan pemasukan dan pengeluaran Anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filteredTransactions.length > 0 && (
            <button
              type="button"
              onClick={() =>
                exportTransactionsToCSV(
                  filteredTransactions,
                  categoriesMap,
                  "money-tracker-filter"
                )
              }
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Ekspor Hasil Filter ({filteredTransactions.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => openNewTransaction("expense")}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            <Plus className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
            <span>Catat Transaksi</span>
          </button>
        </div>
      </div>

      {/* Focal Point: Search & Filter Control Panel */}
      <section
        aria-label="Filter dan pencarian transaksi"
        className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          {/* Search Input (3 cols) */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label
              htmlFor="tx-search"
              className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
            >
              Cari Catatan / Nominal
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
                aria-hidden="true"
              />
              <input
                id="tx-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari transaksi..."
                className="h-11 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60"
              />
            </div>
          </div>

          {/* Month Filter (2 cols) */}
          <div className="lg:col-span-2">
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="tx-month-filter"
                className="text-xs font-medium text-[var(--text-secondary)]"
              >
                Bulan
              </label>
              <label className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={showAllMonths}
                  onChange={(e) => setShowAllMonths(e.target.checked)}
                  className="h-3.5 w-3.5 rounded accent-[var(--accent-primary)]"
                />
                <span>Semua</span>
              </label>
            </div>
            <input
              id="tx-month-filter"
              type="month"
              disabled={showAllMonths}
              value={filterMonth}
              onChange={(e) => setCustomMonth(e.target.value)}
              className="h-11 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-2.5 py-2 text-xs text-[var(--text-primary)] disabled:opacity-50"
            />
          </div>

          {/* Type Filter (2 cols) */}
          <div className="lg:col-span-2">
            <label
              htmlFor="tx-type-filter"
              className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
            >
              Jenis Arus Kas
            </label>
            <select
              id="tx-type-filter"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as "all" | "income" | "expense");
                setFilterCategoryId("all");
              }}
              className="h-11 w-full truncate rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-2.5 py-2 text-xs text-[var(--text-primary)]"
            >
              <option value="all">Semua Jenis</option>
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
            </select>
          </div>

          {/* Category Filter (3 cols) */}
          <div className="lg:col-span-3">
            <label
              htmlFor="tx-cat-select"
              className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
            >
              Kategori
            </label>
            <select
              id="tx-cat-select"
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className="h-11 w-full truncate rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-2.5 py-2 text-xs text-[var(--text-primary)]"
            >
              <option value="all">Semua Kategori ({availableCategories.length})</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === "income" ? "Masuk" : "Keluar"})
                </option>
              ))}
            </select>
          </div>

          {/* Sort Mode (2 cols) */}
          <div className="lg:col-span-2">
            <label
              htmlFor="tx-sort-mode"
              className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
            >
              Urutkan
            </label>
            <select
              id="tx-sort-mode"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="h-11 w-full truncate rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-2.5 py-2 text-xs text-[var(--text-primary)]"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="highest">Nominal Tertinggi</option>
              <option value="lowest">Nominal Terendah</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex items-center justify-end border-t border-dashed border-[var(--border-color)] pt-3">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Atur Ulang Filter</span>
            </button>
          </div>
        )}
      </section>

      {/* Filtered Summary Strip */}
      <section
        aria-label="Ringkasan total hasil filter"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Total Pemasukan Terfilter
          </span>
          <p
            className={cn(
              "mt-1 font-mono text-lg font-bold tabular-nums",
              summary.income > 0
                ? "text-[var(--color-income)]"
                : "text-[var(--text-primary)]"
            )}
          >
            {formatSignedIDR(summary.income, "income")}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Total Pengeluaran Terfilter
          </span>
          <p
            className={cn(
              "mt-1 font-mono text-lg font-bold tabular-nums",
              summary.expense > 0
                ? "text-[var(--color-expense)]"
                : "text-[var(--text-primary)]"
            )}
          >
            {formatSignedIDR(summary.expense, "expense")}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Selisih Bersih ({filteredTransactions.length} transaksi)
          </span>
          <p
            className={cn(
              "mt-1 font-mono text-lg font-bold tabular-nums",
              summary.net < 0
                ? "text-[var(--color-expense)]"
                : summary.net > 0
                ? "text-[var(--color-income)]"
                : "text-[var(--text-primary)]"
            )}
          >
            {formatSignedIDR(summary.net, "net")}
          </p>
        </div>
      </section>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-12 text-center">
          <p className="text-base font-semibold text-[var(--text-primary)]">
            {transactions.length === 0
              ? "Belum ada transaksi yang tercatat"
              : "Tidak ada transaksi yang cocok dengan filter"}
          </p>
          <p className="mt-1 max-w-md text-xs text-[var(--text-secondary)]">
            {transactions.length === 0
              ? "Catat transaksi pemasukan atau pengeluaran pertama Anda untuk mulai mengisi buku kas."
              : "Coba ubah kata kunci pencarian, pilih semua bulan, atau atur ulang filter di atas."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {transactions.length === 0 ? (
              <button
                type="button"
                onClick={() => openNewTransaction("expense")}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
              >
                <Plus className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
                <span>Catat Transaksi</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>Tampilkan Semua Transaksi</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <section
              key={group.date}
              aria-label={`Transaksi tanggal ${formatDateLong(group.date)}`}
              className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-[var(--border-color)] bg-[var(--bg-subtle)]/60 px-4 py-2.5 sm:px-5">
                <h2 className="text-xs font-bold text-[var(--text-primary)]">
                  {formatDateLong(group.date)}
                </h2>
                <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                  {group.dayIncome > 0 && (
                    <span className="font-semibold text-[var(--color-income)]">
                      +{formatIDR(group.dayIncome)}
                    </span>
                  )}
                  {group.dayExpense > 0 && (
                    <span className="font-semibold text-[var(--color-expense)]">
                      -{formatIDR(group.dayExpense)}
                    </span>
                  )}
                </div>
              </div>

              <ul className="divide-y divide-dashed divide-[var(--border-color)] px-4 sm:px-5">
                {group.items.map((tx) => {
                  const cat = categoriesMap.get(tx.categoryId);
                  const isIncome = tx.type === "income";
                  const isConfirming = deletingId === tx.id;

                  return (
                    <li
                      key={tx.id}
                      className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                          style={{
                            backgroundColor: cat?.color ?? "#64748b",
                          }}
                        >
                          <CategoryIcon
                            name={cat?.icon ?? "CircleEllipsis"}
                            className="h-4 w-4"
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                              {cat?.name ?? "Kategori Dihapus"}
                            </p>
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[11px] font-medium",
                                isIncome
                                  ? "bg-[var(--color-income-bg)] text-[var(--color-income)]"
                                  : "bg-[var(--color-expense-bg)] text-[var(--color-expense)]"
                              )}
                            >
                              {isIncome ? "Pemasukan" : "Pengeluaran"}
                            </span>
                          </div>
                          <p className="mt-0.5 break-words text-xs text-[var(--text-secondary)]">
                            {tx.note || "Tanpa catatan tambahan"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span
                          className={cn(
                            "font-mono text-sm font-bold tabular-nums",
                            isIncome
                              ? "text-[var(--color-income)]"
                              : "text-[var(--color-expense)]"
                          )}
                        >
                          {isIncome ? "+" : "-"}
                          {formatIDR(tx.amount)}
                        </span>

                        {isConfirming ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDelete(tx.id)}
                              className="min-h-[44px] rounded-lg bg-[var(--color-expense)] px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              Ya, Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="min-h-[44px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)]"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditTransaction(tx)}
                              aria-label={`Edit transaksi ${cat?.name ?? ""} ${formatIDR(tx.amount)}`}
                              title="Edit transaksi"
                              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(tx.id)}
                              aria-label={`Hapus transaksi ${cat?.name ?? ""} ${formatIDR(tx.amount)}`}
                              title="Hapus transaksi"
                              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--color-expense-bg)] hover:text-[var(--color-expense)]"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
