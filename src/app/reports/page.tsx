"use client";

import React, { useMemo, useState } from "react";
import { endOfMonth, parseISO } from "date-fns";
import { Download } from "lucide-react";
import { useMoneyData } from "@/components/money-data-provider";
import {
  formatIDR,
  formatMonthLabel,
  formatSignedIDR,
} from "@/lib/format";
import { useClientDateInfo } from "@/lib/use-client-date";
import { exportTransactionsToCSV } from "@/lib/csv";
import type { Category } from "@/lib/types";
import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/utils";

interface CategoryRecapRow {
  category: Category;
  txCount: number;
  totalAmount: number;
  percentageOfType: number;
  budgetLimit: number;
}

export default function ReportsPage() {
  const { categories, transactions, budgets, isLoading } = useMoneyData();
  const { todayISO, currentMonthISO: nowMonthISO } = useClientDateInfo();
  const [customMonth, setCustomMonth] = useState<string | null>(null);

  const selectedMonth = customMonth ?? nowMonthISO;
  const currentDayOfMonth = todayISO
    ? Math.max(parseInt(todayISO.slice(8, 10), 10) || 1, 1)
    : 30;

  const monthTransactions = useMemo(
    () =>
      selectedMonth
        ? transactions.filter((tx) => tx.date.startsWith(selectedMonth))
        : [],
    [transactions, selectedMonth]
  );

  const categoriesMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) {
      map.set(c.id, c);
    }
    return map;
  }, [categories]);

  const report = useMemo(() => {
    const budgetMap = new Map<string, number>();
    for (const b of budgets) {
      if (b.month === selectedMonth && b.categoryId !== "TOTAL") {
        budgetMap.set(b.categoryId, b.amount);
      }
    }

    let totalIncome = 0;
    let totalExpense = 0;
    const sumByCat = new Map<string, { amount: number; count: number }>();

    for (const tx of monthTransactions) {
      if (tx.type === "income") totalIncome += tx.amount;
      else totalExpense += tx.amount;

      const cur = sumByCat.get(tx.categoryId) ?? { amount: 0, count: 0 };
      cur.amount += tx.amount;
      cur.count += 1;
      sumByCat.set(tx.categoryId, cur);
    }

    const expenseRows: CategoryRecapRow[] = [];
    const incomeRows: CategoryRecapRow[] = [];

    for (const cat of categories) {
      const stat = sumByCat.get(cat.id) ?? { amount: 0, count: 0 };
      const budgetLimit = budgetMap.get(cat.id) ?? 0;

      if (cat.type === "expense") {
        if (stat.amount > 0 || budgetLimit > 0) {
          expenseRows.push({
            category: cat,
            txCount: stat.count,
            totalAmount: stat.amount,
            percentageOfType:
              totalExpense > 0
                ? Math.round((stat.amount / totalExpense) * 1000) / 10
                : 0,
            budgetLimit,
          });
        }
      } else {
        if (stat.amount > 0) {
          incomeRows.push({
            category: cat,
            txCount: stat.count,
            totalAmount: stat.amount,
            percentageOfType:
              totalIncome > 0
                ? Math.round((stat.amount / totalIncome) * 1000) / 10
                : 0,
            budgetLimit: 0,
          });
        }
      }
    }

    expenseRows.sort((a, b) => b.totalAmount - a.totalAmount);
    incomeRows.sort((a, b) => b.totalAmount - a.totalAmount);

    const netCashflow = totalIncome - totalExpense;
    const savingsRate =
      totalIncome > 0
        ? Math.round(((totalIncome - totalExpense) / totalIncome) * 1000) / 10
        : 0;

    let daysCount = 30;
    if (selectedMonth) {
      const monthStart = parseISO(`${selectedMonth}-01`);
      if (!Number.isNaN(monthStart.getTime())) {
        daysCount =
          selectedMonth === nowMonthISO
            ? currentDayOfMonth
            : endOfMonth(monthStart).getDate();
      }
    }

    const dailyAverageExpense =
      totalExpense > 0 ? Math.round(totalExpense / daysCount) : 0;

    return {
      totalIncome,
      totalExpense,
      netCashflow,
      savingsRate,
      dailyAverageExpense,
      expenseRows,
      incomeRows,
      topExpenseCategory:
        expenseRows.length > 0 && expenseRows[0].totalAmount > 0
          ? expenseRows[0]
          : null,
    };
  }, [categories, budgets, monthTransactions, selectedMonth, nowMonthISO, currentDayOfMonth]);

  // Build SVG Donut segments for expense breakdown
  const donutSegments = useMemo(() => {
    const activeRows = report.expenseRows.filter((r) => r.totalAmount > 0);
    if (activeRows.length === 0 || report.totalExpense <= 0) return [];

    const radius = 64;
    const circumference = 2 * Math.PI * radius;
    let accumulatedFraction = 0;

    return activeRows.map((row) => {
      const fraction = row.totalAmount / report.totalExpense;
      const strokeLength = fraction * circumference;
      const strokeOffset = -accumulatedFraction * circumference;
      accumulatedFraction += fraction;

      return {
        id: row.category.id,
        name: row.category.name,
        color: row.category.color,
        amount: row.totalAmount,
        percentage: row.percentageOfType,
        strokeDasharray: `${strokeLength} ${circumference}`,
        strokeDashoffset: strokeOffset,
      };
    });
  }, [report.expenseRows, report.totalExpense]);

  if (isLoading || !selectedMonth) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6"
      >
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          Menyusun laporan keuangan bulanan dari PostgreSQL...
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
            Laporan & Analisis Keuangan
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Analisis proporsi pengeluaran dan tabel rekapitulasi buku kas bulan{" "}
            <span className="font-semibold text-[var(--text-primary)]">
              {formatMonthLabel(selectedMonth)}
            </span>
            .
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="report-month-picker"
            className="text-xs font-medium text-[var(--text-secondary)]"
          >
            Periode:
          </label>
          <input
            id="report-month-picker"
            type="month"
            value={selectedMonth}
            onChange={(e) => setCustomMonth(e.target.value)}
            className="min-h-[44px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
          />
          {monthTransactions.length > 0 && (
            <button
              type="button"
              onClick={() =>
                exportTransactionsToCSV(
                  monthTransactions,
                  categoriesMap,
                  `laporan-${selectedMonth}`
                )
              }
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Unduh CSV Bulan Ini</span>
            </button>
          )}
        </div>
      </div>

      {/* Focal Point: Monthly Financial Highlights */}
      <section
        aria-label="Indikator kinerja keuangan bulanan"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Arus Kas Bersih (Surplus / Defisit)
          </span>
          <p
            className={cn(
              "mt-1.5 font-mono text-xl font-bold tabular-nums",
              report.netCashflow < 0
                ? "text-[var(--color-expense)]"
                : report.netCashflow > 0
                ? "text-[var(--color-income)]"
                : "text-[var(--text-primary)]"
            )}
          >
            {formatSignedIDR(report.netCashflow, "net")}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
            Masuk {formatIDR(report.totalIncome)} vs Keluar{" "}
            {formatIDR(report.totalExpense)}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Rasio Tabungan (Savings Rate)
          </span>
          <p
            className={cn(
              "mt-1.5 font-mono text-xl font-bold tabular-nums",
              report.savingsRate < 0
                ? "text-[var(--color-expense)]"
                : "text-[var(--text-primary)]"
            )}
          >
            {report.totalIncome > 0 ? `${report.savingsRate}%` : "0%"}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
            {report.totalIncome > 0
              ? "Persentase pemasukan yang tersisa"
              : "Belum ada catatan pemasukan"}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Rata-rata Pengeluaran Harian
          </span>
          <p className="mt-1.5 font-mono text-xl font-bold tabular-nums text-[var(--text-primary)]">
            {formatIDR(report.dailyAverageExpense)}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
            Dari {monthTransactions.filter((t) => t.type === "expense").length}{" "}
            transaksi pengeluaran
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Pos Pengeluaran Terbesar
          </span>
          {report.topExpenseCategory ? (
            <>
              <p className="mt-1.5 truncate text-base font-bold text-[var(--text-primary)]">
                {report.topExpenseCategory.category.name}
              </p>
              <p className="mt-1 font-mono text-xs font-semibold tabular-nums text-[var(--color-expense)]">
                {formatIDR(report.topExpenseCategory.totalAmount)} (
                {report.topExpenseCategory.percentageOfType}%)
              </p>
            </>
          ) : (
            <>
              <p className="mt-1.5 text-base font-semibold text-[var(--text-secondary)]">
                Belum Ada Data
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                Tidak ada pengeluaran di bulan ini
              </p>
            </>
          )}
        </div>
      </section>

      {/* Donut Chart & Category Breakdown */}
      <section
        aria-labelledby="expense-distribution-heading"
        className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6"
      >
        <div className="border-b border-dashed border-[var(--border-color)] pb-4">
          <h2
            id="expense-distribution-heading"
            className="text-base font-semibold text-[var(--text-primary)]"
          >
            Ke Mana Perginya Pengeluaran Anda Bulan Ini?
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Proporsi pengeluaran per kategori terhadap total pengeluaran{" "}
            {formatIDR(report.totalExpense)}.
          </p>
        </div>

        {donutSegments.length === 0 ? (
          <div className="mt-4 flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-color)] bg-[var(--bg-page)] p-6 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Belum ada pengeluaran pada bulan {formatMonthLabel(selectedMonth)}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Catat transaksi pengeluaran untuk melihat grafik proporsi kategori di sini.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
            {/* SVG Donut Chart */}
            <div className="flex flex-col items-center justify-center lg:col-span-5">
              <div className="relative flex h-52 w-52 items-center justify-center">
                <svg
                  viewBox="0 0 160 160"
                  className="h-full w-full -rotate-90"
                  role="img"
                  aria-label="Diagram donat proporsi pengeluaran per kategori"
                >
                  <circle
                    cx="80"
                    cy="80"
                    r="64"
                    fill="transparent"
                    stroke="var(--bg-subtle)"
                    strokeWidth="22"
                  />
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.id}
                      cx="80"
                      cy="80"
                      r="64"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="22"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                    Total Keluar
                  </span>
                  <span className="mt-0.5 font-mono text-xs font-bold tabular-nums text-[var(--text-primary)]">
                    {formatIDR(report.totalExpense)}
                  </span>
                </div>
              </div>
            </div>

            {/* Horizontal Proportion Bars */}
            <div className="space-y-3 lg:col-span-7">
              {report.expenseRows
                .filter((r) => r.totalAmount > 0)
                .map((row) => (
                  <div key={row.category.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-3 w-3 shrink-0 rounded-xs"
                          style={{ backgroundColor: row.category.color }}
                          aria-hidden="true"
                        />
                        <span className="truncate font-semibold text-[var(--text-primary)]">
                          {row.category.name}
                        </span>
                        <span className="text-[var(--text-secondary)]">
                          ({row.txCount}x)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {formatIDR(row.totalAmount)}
                        </span>
                        <span className="w-12 text-right text-[var(--text-secondary)]">
                          {row.percentageOfType}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(row.percentageOfType, 100)}%`,
                          backgroundColor: row.category.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </section>

      {/* Complete Monthly Recapitulation Ledger Table */}
      <section
        aria-labelledby="recap-table-heading"
        className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]"
      >
        <div className="border-b border-dashed border-[var(--border-color)] p-5 sm:p-6">
          <h2
            id="recap-table-heading"
            className="text-base font-semibold text-[var(--text-primary)]"
          >
            Tabel Rekapitulasi Bulanan Lengkap ({formatMonthLabel(selectedMonth)})
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Rincian seluruh pos pemasukan, pengeluaran, frekuensi transaksi, dan perbandingan terhadap batas anggaran.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-subtle)]/70 text-[11px] font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
                <th scope="col" className="px-4 py-3 sm:px-6">
                  Kategori
                </th>
                <th scope="col" className="px-3 py-3">
                  Tipe
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Transaksi
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Realisasi (IDR)
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Proporsi
                </th>
                <th scope="col" className="px-4 py-3 text-right sm:px-6">
                  Selisih Anggaran
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-[var(--border-color)]">
              {report.incomeRows.length === 0 && report.expenseRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-xs text-[var(--text-secondary)]"
                  >
                    Belum ada transaksi atau anggaran yang tercatat pada bulan{" "}
                    {formatMonthLabel(selectedMonth)}.
                  </td>
                </tr>
              ) : (
                <>
                  {/* Income Rows */}
                  {report.incomeRows.map((row) => (
                    <tr
                      key={row.category.id}
                      className="hover:bg-[var(--bg-subtle)]/40"
                    >
                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)] sm:px-6">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-white"
                            style={{ backgroundColor: row.category.color }}
                          >
                            <CategoryIcon
                              name={row.category.icon}
                              className="h-3.5 w-3.5"
                            />
                          </span>
                          <span>{row.category.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded bg-[var(--color-income-bg)] px-2 py-0.5 font-medium text-[var(--color-income)]">
                          Pemasukan
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                        {row.txCount}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-[var(--color-income)]">
                        +{formatIDR(row.totalAmount)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                        {row.percentageOfType}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[var(--text-secondary)] sm:px-6">
                        Tidak Berlaku
                      </td>
                    </tr>
                  ))}

                  {/* Expense Rows */}
                  {report.expenseRows.map((row) => {
                    const budgetDiff = row.budgetLimit - row.totalAmount;
                    return (
                      <tr
                        key={row.category.id}
                        className="hover:bg-[var(--bg-subtle)]/40"
                      >
                        <td className="px-4 py-3 font-semibold text-[var(--text-primary)] sm:px-6">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-white"
                              style={{ backgroundColor: row.category.color }}
                            >
                              <CategoryIcon
                                name={row.category.icon}
                                className="h-3.5 w-3.5"
                              />
                            </span>
                            <span>{row.category.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded bg-[var(--color-expense-bg)] px-2 py-0.5 font-medium text-[var(--color-expense)]">
                            Pengeluaran
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                          {row.txCount}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-[var(--color-expense)]">
                          -{formatIDR(row.totalAmount)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                          {row.percentageOfType}%
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums sm:px-6">
                          {row.budgetLimit > 0 ? (
                            <span
                              className={cn(
                                "font-semibold",
                                budgetDiff < 0
                                  ? "text-[var(--color-expense)]"
                                  : "text-[var(--color-income)]"
                              )}
                            >
                              {budgetDiff >= 0
                                ? `Sisa ${formatIDR(budgetDiff)}`
                                : `Lewat ${formatIDR(Math.abs(budgetDiff))}`}
                            </span>
                          ) : (
                            <span className="text-[var(--text-secondary)]">
                              Tanpa Batas
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
            <tfoot className="border-t-2 border-[var(--border-color)] bg-[var(--bg-subtle)]/50 font-mono text-xs font-bold tabular-nums">
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-2.5 font-sans text-[var(--text-secondary)] sm:px-6"
                >
                  Total Pemasukan Bulan Ini
                </td>
                <td
                  className={cn(
                    "px-4 py-2.5 text-right",
                    report.totalIncome > 0
                      ? "text-[var(--color-income)]"
                      : "text-[var(--text-primary)]"
                  )}
                >
                  {formatSignedIDR(report.totalIncome, "income")}
                </td>
                <td colSpan={2} />
              </tr>
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-2.5 font-sans text-[var(--text-secondary)] sm:px-6"
                >
                  Total Pengeluaran Bulan Ini
                </td>
                <td
                  className={cn(
                    "px-4 py-2.5 text-right",
                    report.totalExpense > 0
                      ? "text-[var(--color-expense)]"
                      : "text-[var(--text-primary)]"
                  )}
                >
                  {formatSignedIDR(report.totalExpense, "expense")}
                </td>
                <td colSpan={2} />
              </tr>
              <tr className="border-t border-dashed border-[var(--border-color)] text-sm">
                <td
                  colSpan={3}
                  className="px-4 py-3 font-sans font-bold text-[var(--text-primary)] sm:px-6"
                >
                  Arus Kas Bersih (Surplus / Defisit)
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right",
                    report.netCashflow < 0
                      ? "text-[var(--color-expense)]"
                      : report.netCashflow > 0
                      ? "text-[var(--color-income)]"
                      : "text-[var(--text-primary)]"
                  )}
                >
                  {formatSignedIDR(report.netCashflow, "net")}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
