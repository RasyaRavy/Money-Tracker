"use client";

import React, { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Check,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  X,
  Target,
} from "lucide-react";
import { useMoneyData } from "@/components/money-data-provider";
import {
  formatIDR,
  formatMonthLabel,
  formatThousandInput,
  parseThousandInput,
} from "@/lib/format";
import { useClientDateInfo } from "@/lib/use-client-date";
import type { Category } from "@/lib/types";
import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/utils";

interface EditingBudgetTarget {
  id: string; // "TOTAL" or Category["id"]
  name: string;
  currentLimit: number;
  currentSpent: number;
  category?: Category;
}

export default function BudgetsPage() {
  const {
    categories,
    transactions,
    budgets,
    isLoading,
    saveBudget,
    deleteBudget,
  } = useMoneyData();
  const { currentMonthISO } = useClientDateInfo();
  const [customMonth, setCustomMonth] = useState<string | null>(null);
  const [editingTarget, setEditingTarget] = useState<EditingBudgetTarget | null>(
    null
  );
  const [amountInput, setAmountInput] = useState<string>("");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");

  const selectedMonth = customMonth ?? currentMonthISO;

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories]
  );

  const budgetState = useMemo(() => {
    const spentByCategory = new Map<string, number>();
    let totalSpent = 0;

    if (selectedMonth) {
      for (const tx of transactions) {
        if (tx.type === "expense" && tx.date.startsWith(selectedMonth)) {
          totalSpent += tx.amount;
          spentByCategory.set(
            tx.categoryId,
            (spentByCategory.get(tx.categoryId) ?? 0) + tx.amount
          );
        }
      }
    }

    const budgetByCategory = new Map<string, number>();
    let explicitTotalLimit = 0;
    let categorySumLimit = 0;

    for (const b of budgets) {
      if (b.month !== selectedMonth) continue;
      if (b.categoryId === "TOTAL") {
        explicitTotalLimit = b.amount;
      } else {
        budgetByCategory.set(b.categoryId, b.amount);
        categorySumLimit += b.amount;
      }
    }

    const effectiveTotalLimit =
      explicitTotalLimit > 0 ? explicitTotalLimit : categorySumLimit;

    return {
      totalSpent,
      explicitTotalLimit,
      effectiveTotalLimit,
      categorySumLimit,
      spentByCategory,
      budgetByCategory,
    };
  }, [transactions, budgets, selectedMonth]);

  const openBudgetModal = (target: EditingBudgetTarget) => {
    setEditingTarget(target);
    setAmountInput(
      target.currentLimit > 0 ? formatThousandInput(target.currentLimit) : ""
    );
    setFeedbackMessage("");
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarget || !selectedMonth) return;

    const parsed = parseThousandInput(amountInput);

    await saveBudget({
      month: selectedMonth,
      categoryId: editingTarget.id,
      amount: parsed,
    });

    if (parsed <= 0) {
      setFeedbackMessage(`Batas anggaran "${editingTarget.name}" dihapus.`);
    } else {
      setFeedbackMessage(
        `Batas anggaran "${editingTarget.name}" disimpan (${formatIDR(parsed)}).`
      );
    }

    setEditingTarget(null);
    setAmountInput("");
  };

  const handleDeleteBudget = async (targetCategoryId: string, name: string) => {
    if (!selectedMonth) return;
    await deleteBudget(selectedMonth, targetCategoryId);
    if (editingTarget?.id === targetCategoryId) {
      setEditingTarget(null);
    }
    setFeedbackMessage(`Batas anggaran "${name}" dihapus.`);
  };

  if (isLoading || !selectedMonth) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6"
      >
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          Memuat data anggaran bulanan dari PostgreSQL...
        </p>
      </div>
    );
  }

  const totalPct =
    budgetState.effectiveTotalLimit > 0
      ? Math.round((budgetState.totalSpent / budgetState.effectiveTotalLimit) * 100)
      : 0;

  const totalRemaining = budgetState.effectiveTotalLimit - budgetState.totalSpent;

  return (
    <div className="space-y-6">
      {/* Header & Month Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Anggaran Bulanan
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Tetapkan batas pengeluaran total dan per kategori untuk{" "}
            <span className="font-semibold text-[var(--text-primary)]">
              {formatMonthLabel(selectedMonth)}
            </span>
            .
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="budget-month-picker"
            className="text-xs font-medium text-[var(--text-secondary)]"
          >
            Pilih Bulan:
          </label>
          <input
            id="budget-month-picker"
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              setCustomMonth(e.target.value);
              setEditingTarget(null);
            }}
            className="min-h-[44px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
          />
        </div>
      </div>

      {feedbackMessage && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between rounded-lg border border-[var(--color-income)] bg-[var(--color-income-bg)] px-4 py-2.5 text-xs font-medium text-[var(--color-income)]"
        >
          <span>{feedbackMessage}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage("")}
            aria-label="Tutup pemberitahuan"
            className="ml-3 rounded p-1 hover:bg-black/10"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Focal Point: Monthly Total Budget Card */}
      <section
        aria-labelledby="total-budget-heading"
        className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6"
      >
        <div className="flex flex-col gap-4 border-b border-dashed border-[var(--border-color)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
              Plafon Pengeluaran Bulanan
            </span>
            <h2
              id="total-budget-heading"
              className="mt-1 text-lg font-bold text-[var(--text-primary)]"
            >
              Total Anggaran {formatMonthLabel(selectedMonth)}
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {budgetState.explicitTotalLimit > 0
                ? "Menggunakan batas total manual yang Anda tetapkan."
                : budgetState.categorySumLimit > 0
                ? "Dihitung otomatis dari akumulasi anggaran per kategori di bawah."
                : "Belum ada batas anggaran yang ditetapkan untuk bulan ini."}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              openBudgetModal({
                id: "TOTAL",
                name: `Total Anggaran ${formatMonthLabel(selectedMonth)}`,
                currentLimit: budgetState.explicitTotalLimit,
                currentSpent: budgetState.totalSpent,
              })
            }
            className="inline-flex min-h-[44px] items-center gap-2 self-start rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] sm:self-auto"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {budgetState.explicitTotalLimit > 0
                ? "Ubah Total Anggaran"
                : "Atur Total Anggaran"}
            </span>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] p-4">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Total Batas Anggaran
            </span>
            <p className="mt-1 font-mono text-xl font-bold tabular-nums text-[var(--text-primary)]">
              {formatIDR(budgetState.effectiveTotalLimit)}
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] p-4">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Realisasi Pengeluaran
            </span>
            <p
              className={cn(
                "mt-1 font-mono text-xl font-bold tabular-nums",
                budgetState.totalSpent > 0
                  ? "text-[var(--color-expense)]"
                  : "text-[var(--text-primary)]"
              )}
            >
              {formatIDR(budgetState.totalSpent)}
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] p-4">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {totalRemaining >= 0
                ? "Sisa Anggaran Tersedia"
                : "Kelebihan Pengeluaran"}
            </span>
            <p
              className={cn(
                "mt-1 font-mono text-xl font-bold tabular-nums",
                budgetState.effectiveTotalLimit === 0
                  ? "text-[var(--text-primary)]"
                  : totalRemaining < 0
                  ? "text-[var(--color-expense)]"
                  : "text-[var(--color-income)]"
              )}
            >
              {budgetState.effectiveTotalLimit === 0
                ? "Rp 0"
                : formatIDR(Math.abs(totalRemaining))}
            </p>
          </div>
        </div>

        {budgetState.effectiveTotalLimit > 0 && (
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--text-secondary)]">
                Progres Pemakaian Anggaran Total
              </span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {totalPct}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={Math.min(totalPct, 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progres pemakaian total anggaran bulanan"
              className="h-3.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]"
            >
              <div
                className={cn(
                  "h-full transition-all",
                  totalPct >= 100
                    ? "bg-[var(--color-expense)]"
                    : totalPct >= 80
                    ? "bg-[var(--color-warning)]"
                    : "bg-[var(--color-income)]"
                )}
                style={{ width: `${Math.min(totalPct, 100)}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Per-Category Expense Budgets (Uniform Card Rhythm, Editing Opens Modal/Bottom Sheet) */}
      <section aria-labelledby="category-budgets-heading" className="space-y-4">
        <div>
          <h2
            id="category-budgets-heading"
            className="text-base font-semibold text-[var(--text-primary)]"
          >
            Rincian Anggaran per Kategori Pengeluaran
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Indikator status: Aman (&lt;80%), Hampir Habis (80%-99%), dan Melebihi Anggaran (&ge;100%).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {expenseCategories.map((cat) => {
            const limit = budgetState.budgetByCategory.get(cat.id) ?? 0;
            const spent = budgetState.spentByCategory.get(cat.id) ?? 0;
            const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
            const diff = limit - spent;

            return (
              <div
                key={cat.id}
                className="flex flex-col justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: cat.color }}
                      >
                        <CategoryIcon name={cat.icon} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-[var(--text-primary)]">
                          {cat.name}
                        </h3>
                        <p className="font-mono text-xs tabular-nums text-[var(--text-secondary)]">
                          Terpakai: {formatIDR(spent)}
                        </p>
                      </div>
                    </div>

                    {limit > 0 && (
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold",
                          pct >= 100
                            ? "bg-[var(--color-expense-bg)] text-[var(--color-expense)]"
                            : pct >= 80
                            ? "bg-[var(--color-warning-bg)] text-[var(--color-warning)]"
                            : "bg-[var(--color-income-bg)] text-[var(--color-income)]"
                        )}
                      >
                        {pct >= 100 ? (
                          <>
                            <AlertCircle className="h-3 w-3" aria-hidden="true" />
                            <span>Overbudget ({pct}%)</span>
                          </>
                        ) : pct >= 80 ? (
                          <>
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            <span>Hampir Habis ({pct}%)</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            <span>Aman ({pct}%)</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  {limit > 0 ? (
                    <div className="mt-4 space-y-2">
                      <div
                        role="progressbar"
                        aria-valuenow={Math.min(pct, 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Pemakaian anggaran kategori ${cat.name}`}
                        className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]"
                      >
                        <div
                          className={cn(
                            "h-full transition-all",
                            pct >= 100
                              ? "bg-[var(--color-expense)]"
                              : pct >= 80
                              ? "bg-[var(--color-warning)]"
                              : "bg-[var(--color-income)]"
                          )}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between font-mono text-xs tabular-nums">
                        <span className="text-[var(--text-secondary)]">
                          Batas: {formatIDR(limit)}
                        </span>
                        <span
                          className={cn(
                            "font-semibold",
                            diff < 0
                              ? "text-[var(--color-expense)]"
                              : "text-[var(--color-income)]"
                          )}
                        >
                          {diff >= 0
                            ? `Sisa ${formatIDR(diff)}`
                            : `Lewat ${formatIDR(Math.abs(diff))}`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-[var(--text-secondary)]">
                      Belum ada batas anggaran untuk kategori ini.
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-dashed border-[var(--border-color)] pt-3.5">
                  <button
                    type="button"
                    onClick={() =>
                      openBudgetModal({
                        id: cat.id,
                        name: cat.name,
                        currentLimit: limit,
                        currentSpent: spent,
                        category: cat,
                      })
                    }
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{limit > 0 ? "Ubah Batas" : "Tetapkan Batas"}</span>
                  </button>
                  {limit > 0 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteBudget(cat.id, cat.name)}
                      aria-label={`Hapus batas anggaran ${cat.name}`}
                      title="Hapus batas anggaran"
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-transparent text-[var(--text-secondary)] transition-colors hover:border-[var(--color-expense)]/30 hover:bg-[var(--color-expense-bg)] hover:text-[var(--color-expense)]"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Responsive Modal / Mobile Bottom Sheet for Setting Budget Limit */}
      <Dialog.Root
        open={editingTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditingTarget(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border-t border-[var(--border-color)] bg-[var(--bg-surface)] p-5 pb-8 shadow-lg sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:p-6">
            {editingTarget && (
              <>
                <div className="flex items-start justify-between gap-3 border-b border-dashed border-[var(--border-color)] pb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {editingTarget.category ? (
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: editingTarget.category.color }}
                      >
                        <CategoryIcon
                          name={editingTarget.category.icon}
                          className="h-5 w-5"
                        />
                      </span>
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]">
                        <Target className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <Dialog.Title className="truncate text-base font-bold text-[var(--text-primary)]">
                        {editingTarget.id === "TOTAL"
                          ? "Atur Total Anggaran Bulanan"
                          : `Anggaran ${editingTarget.name}`}
                      </Dialog.Title>
                      <Dialog.Description className="text-xs text-[var(--text-secondary)]">
                        Periode {formatMonthLabel(selectedMonth)} • Terpakai{" "}
                        {formatIDR(editingTarget.currentSpent)}
                      </Dialog.Description>
                    </div>
                  </div>

                  <Dialog.Close
                    aria-label="Tutup dialog anggaran"
                    className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </Dialog.Close>
                </div>

                <form onSubmit={handleSaveBudget} className="mt-5 space-y-5">
                  <div>
                    <label
                      htmlFor="modal-budget-amount"
                      className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]"
                    >
                      Batas Anggaran {editingTarget.name} (Rupiah)
                    </label>
                    <div className="relative flex items-center">
                      <span className="pointer-events-none absolute left-3.5 font-mono text-base font-semibold text-[var(--text-secondary)]">
                        Rp
                      </span>
                      <input
                        id="modal-budget-amount"
                        type="text"
                        inputMode="numeric"
                        autoFocus
                        placeholder="Contoh: 1.500.000"
                        value={amountInput}
                        onChange={(e) =>
                          setAmountInput(formatThousandInput(e.target.value))
                        }
                        className="min-h-[48px] w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] py-2.5 pl-11 pr-4 font-mono text-lg font-bold tabular-nums text-[var(--text-primary)] placeholder:font-normal placeholder:text-[var(--text-secondary)]/50"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-[var(--text-secondary)]">
                      Kosongkan atau isi 0 jika ingin menghapus batas anggaran ini.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-dashed border-[var(--border-color)] pt-4">
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--border-color)]/60"
                      >
                        Batal
                      </button>
                    </Dialog.Close>
                    <button
                      type="submit"
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-4 py-2.5 text-xs font-semibold text-[var(--accent-primary-fg)] transition-colors hover:bg-[var(--accent-primary-hover)]"
                    >
                      <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Simpan Batas</span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
