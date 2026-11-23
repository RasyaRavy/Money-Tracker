"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Pencil,
  Trash2,
  Target,
  FileSpreadsheet,
} from "lucide-react";
import { useMoneyData } from "@/components/money-data-provider";
import {
  formatDateShort,
  formatIDR,
  formatMonthLabel,
  formatSignedIDR,
} from "@/lib/format";
import { useClientDateInfo } from "@/lib/use-client-date";
import type { Category, ChartPeriod } from "@/lib/types";
import { useTransactionModal } from "@/components/layout/app-shell";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { openNewTransaction, openEditTransaction } = useTransactionModal();
  const {
    categories,
    transactions,
    budgets,
    isLoading,
    error,
    deleteTransaction,
    refreshData,
  } = useMoneyData();
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("monthly");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { todayISO, currentMonthISO: currentMonth } = useClientDateInfo();

  const categoriesMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) {
      map.set(c.id, c);
    }
    return map;
  }, [categories]);

  const metrics = useMemo(() => {
    let allIncome = 0;
    let allExpense = 0;
    let monthIncome = 0;
    let monthExpense = 0;

    for (const tx of transactions) {
      if (tx.type === "income") {
        allIncome += tx.amount;
        if (currentMonth && tx.date.startsWith(currentMonth)) {
          monthIncome += tx.amount;
        }
      } else {
        allExpense += tx.amount;
        if (currentMonth && tx.date.startsWith(currentMonth)) {
          monthExpense += tx.amount;
        }
      }
    }

    const sorted = [...transactions].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.createdAt - a.createdAt;
    });

    const monthBudgets = budgets.filter((b) => b.month === currentMonth);
    const totalBudgetRow = monthBudgets.find((b) => b.categoryId === "TOTAL");
    const categoryBudgetSum = monthBudgets
      .filter((b) => b.categoryId !== "TOTAL")
      .reduce((acc, b) => acc + b.amount, 0);

    const totalBudgetLimit =
      totalBudgetRow && totalBudgetRow.amount > 0
        ? totalBudgetRow.amount
        : categoryBudgetSum;

    return {
      totalBalance: allIncome - allExpense,
      allIncome,
      allExpense,
      monthIncome,
      monthExpense,
      recentTransactions: sorted.slice(0, 7),
      totalBudgetLimit,
    };
  }, [transactions, budgets, currentMonth]);

  const handleDelete = async (id: string) => {
    await deleteTransaction(id);
    setDeletingId(null);
  };

  if (isLoading || !currentMonth) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="space-y-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6"
      >
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          Memuat ringkasan buku kas dari PostgreSQL...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-[var(--color-expense)] bg-[var(--color-expense-bg)] p-6 text-sm text-[var(--color-expense)]"
      >
        <p className="font-semibold">{error}</p>
        <button
          type="button"
          onClick={() => refreshData()}
          className="mt-3 rounded-lg border border-[var(--color-expense)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)]"
        >
          Coba Muat Ulang
        </button>
      </div>
    );
  }

  const budgetPercentage =
    metrics.totalBudgetLimit > 0
      ? Math.round((metrics.monthExpense / metrics.totalBudgetLimit) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Buku Kas Pribadi
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Ringkasan saldo dan arus kas periode{" "}
            <span className="font-semibold text-[var(--text-primary)]">
              {formatMonthLabel(currentMonth)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openNewTransaction("income")}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            <ArrowDownLeft
              className="h-4 w-4 text-[var(--color-income)]"
              aria-hidden="true"
            />
            <span>Catat Pemasukan</span>
          </button>
          <button
            type="button"
            onClick={() => openNewTransaction("expense")}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            <ArrowUpRight
              className="h-4 w-4 text-[var(--color-expense)]"
              aria-hidden="true"
            />
            <span>Catat Pengeluaran</span>
          </button>
        </div>
      </div>

      {/* Focal Point: Primary Ledger Summary Card (Asymmetric RHYTHM 2 composition) */}
      <section
        aria-label="Ringkasan saldo utama dan arus kas bulan ini"
        className="grid grid-cols-1 gap-4 lg:grid-cols-12"
      >
        {/* Main Net Balance Box (7 columns on desktop) */}
        <div className="flex flex-col justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6 lg:col-span-7">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
                Saldo Bersih Saat Ini
              </span>
              <span className="rounded border border-[var(--border-color)] bg-[var(--bg-page)] px-2 py-0.5 font-mono text-xs font-medium text-[var(--text-secondary)]">
                Dompet Utama (IDR)
              </span>
            </div>

            <p
              className={cn(
                "mt-3 font-mono text-3xl font-bold tracking-tight tabular-nums sm:text-4xl",
                metrics.totalBalance < 0
                  ? "text-[var(--color-expense)]"
                  : "text-[var(--text-primary)]"
              )}
            >
              {formatIDR(metrics.totalBalance)}
            </p>
            <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
              Selisih seluruh pemasukan ({formatIDR(metrics.allIncome)}) dikurangi seluruh pengeluaran ({formatIDR(metrics.allExpense)}).
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 border-t border-dashed border-[var(--border-color)] pt-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                <ArrowDownLeft
                  className="h-4 w-4 text-[var(--color-income)]"
                  aria-hidden="true"
                />
                <span>Pemasukan Bulan Ini</span>
              </div>
              <p
                className={cn(
                  "mt-1.5 font-mono text-lg font-bold tabular-nums",
                  metrics.monthIncome > 0
                    ? "text-[var(--color-income)]"
                    : "text-[var(--text-primary)]"
                )}
              >
                {formatSignedIDR(metrics.monthIncome, "income")}
              </p>
            </div>

            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                <ArrowUpRight
                  className="h-4 w-4 text-[var(--color-expense)]"
                  aria-hidden="true"
                />
                <span>Pengeluaran Bulan Ini</span>
              </div>
              <p
                className={cn(
                  "mt-1.5 font-mono text-lg font-bold tabular-nums",
                  metrics.monthExpense > 0
                    ? "text-[var(--color-expense)]"
                    : "text-[var(--text-primary)]"
                )}
              >
                {formatSignedIDR(metrics.monthExpense, "expense")}
              </p>
            </div>
          </div>
        </div>

        {/* Side Monthly Budget & Cashflow Health Card (5 columns on desktop) */}
        <div className="flex flex-col justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Status Anggaran {formatMonthLabel(currentMonth)}
              </h2>
              <Target
                className="h-4 w-4 text-[var(--text-secondary)]"
                aria-hidden="true"
              />
            </div>

            {metrics.totalBudgetLimit > 0 ? (
              <div className="mt-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] p-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-xl font-bold tabular-nums text-[var(--text-primary)]">
                    {budgetPercentage}%{" "}
                    <span className="font-sans text-xs font-normal text-[var(--text-secondary)]">
                      terpakai
                    </span>
                  </span>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-semibold",
                      budgetPercentage >= 100
                        ? "bg-[var(--color-expense-bg)] text-[var(--color-expense)]"
                        : budgetPercentage >= 80
                        ? "bg-[var(--color-warning-bg)] text-[var(--color-warning)]"
                        : "bg-[var(--color-income-bg)] text-[var(--color-income)]"
                    )}
                  >
                    {budgetPercentage >= 100
                      ? "Melebihi Anggaran"
                      : budgetPercentage >= 80
                      ? "Hampir Habis"
                      : "Aman"}
                  </span>
                </div>

                <div
                  role="progressbar"
                  aria-valuenow={Math.min(budgetPercentage, 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Persentase pemakaian anggaran bulanan"
                  className="h-3 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]"
                >
                  <div
                    className={cn(
                      "h-full transition-all",
                      budgetPercentage >= 100
                        ? "bg-[var(--color-expense)]"
                        : budgetPercentage >= 80
                        ? "bg-[var(--color-warning)]"
                        : "bg-[var(--color-income)]"
                    )}
                    style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>Terpakai: {formatIDR(metrics.monthExpense)}</span>
                  <span>Batas: {formatIDR(metrics.totalBudgetLimit)}</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-[var(--border-color)] bg-[var(--bg-page)] p-4">
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  Batas anggaran bulan ini belum diatur.
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Tetapkan batas pengeluaran bulanan agar pengeluaran Anda tetap terkendali.
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-dashed border-[var(--border-color)] pt-4">
            <Link
              href="/budgets"
              className="inline-flex min-h-[44px] items-center text-xs font-semibold text-[var(--accent-primary)] hover:underline"
            >
              {metrics.totalBudgetLimit > 0
                ? "Kelola rincian anggaran"
                : "Atur anggaran bulanan"}
            </Link>
            <Link
              href="/reports"
              className="inline-flex min-h-[44px] items-center text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
            >
              Lihat laporan lengkap
            </Link>
          </div>
        </div>
      </section>

      {/* Cashflow Bar Chart */}
      <CashflowChart
        transactions={transactions}
        period={chartPeriod}
        onPeriodChange={setChartPeriod}
        referenceDateISO={todayISO}
        onRecordTransaction={openNewTransaction}
      />

      {/* Recent Transactions List */}
      <section
        aria-labelledby="recent-tx-heading"
        className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6"
      >
        <div className="flex flex-col gap-2 border-b border-dashed border-[var(--border-color)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="recent-tx-heading"
              className="text-base font-semibold text-[var(--text-primary)]"
            >
              Catatan Transaksi Terbaru
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              7 aktivitas terakhir yang tercatat di buku kas Anda.
            </p>
          </div>
          <Link
            href="/transactions"
            className="inline-flex min-h-[44px] items-center text-xs font-semibold text-[var(--accent-primary)] hover:underline"
          >
            Buka seluruh riwayat ({transactions.length})
          </Link>
        </div>

        {metrics.recentTransactions.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-color)] bg-[var(--bg-page)] px-4 py-10 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Buku kas masih kosong
            </p>
            <p className="mt-1 max-w-md text-xs text-[var(--text-secondary)]">
              Anda belum memiliki riwayat pemasukan atau pengeluaran. Mulai catat transaksi pertama Anda atau impor file CSV yang sudah ada.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => openNewTransaction("expense")}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                <Plus className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
                <span>Catat Transaksi</span>
              </button>
              <Link
                href="/settings"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                <span>Impor Data dari CSV</span>
              </Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-dashed divide-[var(--border-color)]">
            {metrics.recentTransactions.map((tx) => {
              const cat = categoriesMap.get(tx.categoryId);
              const isIncome = tx.type === "income";
              const isConfirmingDelete = deletingId === tx.id;

              return (
                <li
                  key={tx.id}
                  className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3 min-w-0">
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
                        <span className="rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                          {formatDateShort(tx.date)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
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

                    {isConfirmingDelete ? (
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
        )}
      </section>
    </div>
  );
}
