"use client";

import React, { useMemo } from "react";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Plus } from "lucide-react";
import { formatCompactIDR, formatIDR } from "@/lib/format";
import type { ChartPeriod, Transaction, TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CashflowChartProps {
  transactions: Transaction[];
  period: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
  referenceDateISO: string;
  onRecordTransaction?: (type: TransactionType) => void;
}

interface ChartBucket {
  key: string;
  label: string;
  fullLabel: string;
  income: number;
  expense: number;
}

export function CashflowChart({
  transactions,
  period,
  onPeriodChange,
  referenceDateISO,
  onRecordTransaction,
}: CashflowChartProps) {
  const buckets = useMemo<ChartBucket[]>(() => {
    if (!referenceDateISO) return [];
    const now = new Date(`${referenceDateISO}T12:00:00`);

    if (period === "weekly") {
      // Last 7 days ending today
      const days = eachDayOfInterval({
        start: subDays(now, 6),
        end: now,
      });
      const map = new Map<string, ChartBucket>();
      for (const day of days) {
        const key = format(day, "yyyy-MM-dd");
        map.set(key, {
          key,
          label: format(day, "EEE", { locale: idLocale }),
          fullLabel: format(day, "EEEE, d MMM yyyy", { locale: idLocale }),
          income: 0,
          expense: 0,
        });
      }
      for (const tx of transactions) {
        const b = map.get(tx.date);
        if (b) {
          if (tx.type === "income") b.income += tx.amount;
          else b.expense += tx.amount;
        }
      }
      return Array.from(map.values());
    }

    if (period === "monthly") {
      // Group current month into 5 weekly buckets (Tgl 1-7, 8-14, 15-21, 22-28, 29-akhir)
      const currentMonthPrefix = format(now, "yyyy-MM");
      const monthLabel = format(now, "MMM yyyy", { locale: idLocale });
      const lastDay = endOfMonth(now).getDate();

      const ranges = [
        { key: "w1", label: "Tgl 1-7", start: 1, end: 7 },
        { key: "w2", label: "Tgl 8-14", start: 8, end: 14 },
        { key: "w3", label: "Tgl 15-21", start: 15, end: 21 },
        { key: "w4", label: "Tgl 22-28", start: 22, end: 28 },
      ];
      if (lastDay >= 29) {
        ranges.push({
          key: "w5",
          label: `Tgl 29-${lastDay}`,
          start: 29,
          end: lastDay,
        });
      }

      const result: ChartBucket[] = ranges.map((r) => ({
        key: r.key,
        label: r.label,
        fullLabel: `${r.label} ${monthLabel}`,
        income: 0,
        expense: 0,
      }));

      for (const tx of transactions) {
        if (!tx.date.startsWith(currentMonthPrefix)) continue;
        const dayNum = parseInt(tx.date.slice(8, 10), 10);
        const bucketIdx = Math.min(Math.floor((dayNum - 1) / 7), result.length - 1);
        if (bucketIdx >= 0 && result[bucketIdx]) {
          if (tx.type === "income") result[bucketIdx].income += tx.amount;
          else result[bucketIdx].expense += tx.amount;
        }
      }

      return result;
    }

    // Yearly: 12 months of current year
    const currentYear = format(now, "yyyy");
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    const map = new Map<string, ChartBucket>();
    for (let m = 0; m < 12; m++) {
      const mStr = String(m + 1).padStart(2, "0");
      const key = `${currentYear}-${mStr}`;
      map.set(key, {
        key,
        label: monthNames[m],
        fullLabel: `${monthNames[m]} ${currentYear}`,
        income: 0,
        expense: 0,
      });
    }

    for (const tx of transactions) {
      if (!tx.date.startsWith(currentYear)) continue;
      const monthKey = tx.date.slice(0, 7);
      const b = map.get(monthKey);
      if (b) {
        if (tx.type === "income") b.income += tx.amount;
        else b.expense += tx.amount;
      }
    }

    return Array.from(map.values());
  }, [transactions, period, referenceDateISO]);

  const maxAmount = useMemo(() => {
    let max = 0;
    for (const b of buckets) {
      if (b.income > max) max = b.income;
      if (b.expense > max) max = b.expense;
    }
    return max > 0 ? max : 1_000_000;
  }, [buckets]);

  const hasAnyData = useMemo(
    () => buckets.some((b) => b.income > 0 || b.expense > 0),
    [buckets]
  );

  const refDate = useMemo(
    () => (referenceDateISO ? new Date(`${referenceDateISO}T12:00:00`) : null),
    [referenceDateISO]
  );

  const periodSubtitle = !refDate
    ? ""
    : period === "weekly"
    ? "7 hari terakhir"
    : period === "monthly"
    ? `Bulan ${format(startOfMonth(refDate), "MMMM yyyy", { locale: idLocale })}`
    : `Tahun ${format(refDate, "yyyy")}`;

  return (
    <section
      aria-labelledby="cashflow-chart-heading"
      className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 border-b border-dashed border-[var(--border-color)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="cashflow-chart-heading"
            className="text-base font-semibold text-[var(--text-primary)]"
          >
            Perbandingan Pemasukan dan Pengeluaran ({periodSubtitle})
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Apakah pengeluaran melebihi pemasukan pada periode yang dipilih?
          </p>
        </div>

        {/* Period Switcher */}
        <div
          role="tablist"
          aria-label="Filter periode grafik arus kas"
          className="inline-flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] p-1"
        >
          {(
            [
              { id: "weekly", label: "Mingguan" },
              { id: "monthly", label: "Bulanan" },
              { id: "yearly", label: "Tahunan" },
            ] as const
          ).map((tab) => {
            const active = period === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onPeriodChange(tab.id)}
                className={cn(
                  "min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-[var(--bg-surface)] font-semibold text-[var(--text-primary)] shadow-2xs ring-1 ring-[var(--border-color)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
            <span
              className="h-3 w-3 rounded-xs bg-[var(--color-income)]"
              aria-hidden="true"
            />
            Pemasukan
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
            <span
              className="h-3 w-3 rounded-xs bg-[var(--color-expense)]"
              aria-hidden="true"
            />
            Pengeluaran
          </span>
        </div>
        <span className="font-mono text-[11px] text-[var(--text-secondary)]">
          Puncak skala: {formatCompactIDR(maxAmount)}
        </span>
      </div>

      {!hasAnyData ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-color)] bg-[var(--bg-page)] px-6 py-8 text-center">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Belum ada catatan arus kas pada periode {periodSubtitle.toLowerCase()}.
          </p>
          <p className="mt-1 max-w-md text-xs text-[var(--text-secondary)]">
            Catat transaksi pemasukan atau pengeluaran untuk melihat perbandingan grafik batang di sini.
          </p>
          {onRecordTransaction && (
            <button
              type="button"
              onClick={() => onRecordTransaction("expense")}
              className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
            >
              <Plus className="h-3.5 w-3.5 text-[var(--accent-primary)]" aria-hidden="true" />
              <span>Catat Transaksi</span>
            </button>
          )}
        </div>
      ) : (
        <div className="mt-5">
          <div
            role="img"
            aria-label={`Grafik batang perbandingan pemasukan dan pengeluaran untuk periode ${periodSubtitle}`}
            className="grid h-56 items-end gap-2 border-b border-[var(--border-color)] pb-2 pt-6 sm:gap-3"
            style={{
              gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))`,
            }}
          >
            {buckets.map((bucket) => {
              const incPct =
                bucket.income > 0
                  ? Math.max(Math.round((bucket.income / maxAmount) * 100), 6)
                  : 0;
              const expPct =
                bucket.expense > 0
                  ? Math.max(Math.round((bucket.expense / maxAmount) * 100), 6)
                  : 0;

              return (
                <div
                  key={bucket.key}
                  className="group relative flex h-full flex-col justify-end"
                  title={`${bucket.fullLabel}\nPemasukan: ${formatIDR(bucket.income)}\nPengeluaran: ${formatIDR(bucket.expense)}`}
                >
                  <div className="flex h-full items-end justify-center gap-1 sm:gap-1.5">
                    {/* Income bar */}
                    <div className="flex h-full w-full max-w-[22px] flex-col justify-end">
                      <div
                        className="w-full rounded-t-xs bg-[var(--color-income)] transition-all"
                        style={{ height: `${incPct}%` }}
                      />
                    </div>
                    {/* Expense bar */}
                    <div className="flex h-full w-full max-w-[22px] flex-col justify-end">
                      <div
                        className="w-full rounded-t-xs bg-[var(--color-expense)] transition-all"
                        style={{ height: `${expPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-Axis Labels */}
          <div
            className="mt-2 grid gap-1 text-center"
            style={{
              gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))`,
            }}
          >
            {buckets.map((bucket) => (
              <div key={bucket.key} className="min-w-0">
                <p className="truncate font-mono text-[11px] font-medium text-[var(--text-secondary)]">
                  {bucket.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
