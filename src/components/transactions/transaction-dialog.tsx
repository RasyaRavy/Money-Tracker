"use client";

import React, { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ArrowDownLeft, ArrowUpRight, Check } from "lucide-react";
import { useMoneyData } from "@/components/money-data-provider";
import {
  formatThousandInput,
  getTodayISO,
  parseThousandInput,
} from "@/lib/format";
import type { Transaction, TransactionType } from "@/lib/types";
import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/utils";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTransaction?: Transaction | null;
  defaultType?: TransactionType;
  onSaved?: () => void;
}

interface TransactionFormBodyProps {
  editingTransaction?: Transaction | null;
  defaultType: TransactionType;
  onClose: () => void;
  onSaved?: () => void;
}

function TransactionFormBody({
  editingTransaction,
  defaultType,
  onClose,
  onSaved,
}: TransactionFormBodyProps) {
  const { categories: allCategories, saveTransaction } = useMoneyData();

  const [type, setType] = useState<TransactionType>(
    editingTransaction ? editingTransaction.type : defaultType
  );
  const [amountInput, setAmountInput] = useState<string>(
    editingTransaction ? formatThousandInput(editingTransaction.amount) : ""
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    editingTransaction ? editingTransaction.categoryId : ""
  );
  const [date, setDate] = useState<string>(
    editingTransaction ? editingTransaction.date : getTodayISO()
  );
  const [note, setNote] = useState<string>(
    editingTransaction ? editingTransaction.note : ""
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const categories = useMemo(
    () => allCategories.filter((c) => c.type === type),
    [allCategories, type]
  );

  const effectiveCategoryId =
    categories.length > 0
      ? categories.some((c) => c.id === selectedCategoryId)
        ? selectedCategoryId
        : categories[0].id
      : selectedCategoryId;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setAmountInput(formatThousandInput(raw));
    if (errorMessage) setErrorMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseThousandInput(amountInput);

    if (numericAmount <= 0) {
      setErrorMessage("Masukkan nominal transaksi lebih dari Rp 0.");
      return;
    }

    if (!effectiveCategoryId) {
      setErrorMessage("Pilih salah satu kategori transaksi.");
      return;
    }

    if (!date) {
      setErrorMessage("Pilih tanggal transaksi.");
      return;
    }

    setIsSubmitting(true);
    try {
      await saveTransaction({
        id: editingTransaction?.id,
        amount: numericAmount,
        type,
        categoryId: effectiveCategoryId,
        date,
        note: note.trim(),
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan transaksi ke database."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <fieldset>
        <legend className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Jenis Transaksi
        </legend>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setType("expense")}
            aria-pressed={type === "expense"}
            className={cn(
              "flex min-h-[44px] items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
              type === "expense"
                ? "border-[var(--color-expense)] bg-[var(--color-expense-bg)] text-[var(--color-expense)]"
                : "border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            )}
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            <span>Pengeluaran</span>
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            aria-pressed={type === "income"}
            className={cn(
              "flex min-h-[44px] items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
              type === "income"
                ? "border-[var(--color-income)] bg-[var(--color-income-bg)] text-[var(--color-income)]"
                : "border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            )}
          >
            <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />
            <span>Pemasukan</span>
          </button>
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="tx-amount"
          className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
        >
          Nominal (Rupiah)
        </label>
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-3.5 font-mono text-base font-semibold text-[var(--text-secondary)]">
            Rp
          </span>
          <input
            id="tx-amount"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            placeholder="0"
            value={amountInput}
            onChange={handleAmountChange}
            className="min-h-[48px] w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] py-2.5 pl-11 pr-4 font-mono text-xl font-semibold tabular-nums text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="tx-category-grid"
          className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
        >
          Kategori {type === "income" ? "Pemasukan" : "Pengeluaran"}
        </label>
        <div
          id="tx-category-grid"
          role="radiogroup"
          aria-label="Pilih kategori transaksi"
          className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto p-0.5 sm:grid-cols-3"
        >
          {categories.map((cat) => {
            const isSelected = cat.id === effectiveCategoryId;
            return (
              <button
                key={cat.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={cn(
                  "flex min-h-[44px] items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors",
                  isSelected
                    ? "border-[var(--text-primary)] bg-[var(--bg-subtle)] text-[var(--text-primary)] ring-1 ring-[var(--text-primary)]"
                    : "border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                )}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white"
                  style={{ backgroundColor: cat.color }}
                >
                  <CategoryIcon name={cat.icon} className="h-3.5 w-3.5" />
                </span>
                <span className="truncate">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="tx-date"
            className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
          >
            Tanggal Transaksi
          </label>
          <input
            id="tx-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="min-h-[44px] w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </div>

        <div>
          <label
            htmlFor="tx-note"
            className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
          >
            Catatan (Opsional)
          </label>
          <input
            id="tx-note"
            type="text"
            maxLength={120}
            placeholder="Contoh: Makan siang nasi padang"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[44px] w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60"
          />
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-[var(--color-expense)] bg-[var(--color-expense-bg)] px-3 py-2.5 text-xs font-medium text-[var(--color-expense)]"
        >
          {errorMessage}
        </div>
      )}

      <div className="flex items-center justify-end gap-2.5 border-t border-dashed border-[var(--border-color)] pt-4">
        <Dialog.Close asChild>
          <button
            type="button"
            className="min-h-[44px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--border-color)]/60"
          >
            Batal
          </button>
        </Dialog.Close>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] px-5 py-2 text-sm font-semibold text-[var(--accent-primary-fg)] transition-colors hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          <span>
            {isSubmitting
              ? "Menyimpan..."
              : editingTransaction
              ? "Simpan Perubahan"
              : "Simpan Transaksi"}
          </span>
        </button>
      </div>
    </form>
  );
}

export function TransactionDialog({
  open,
  onOpenChange,
  editingTransaction,
  defaultType = "expense",
  onSaved,
}: TransactionDialogProps) {
  const formKey = `${open ? "open" : "closed"}-${
    editingTransaction ? editingTransaction.id : defaultType
  }`;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 shadow-lg sm:p-6">
          <div className="flex items-center justify-between border-b border-dashed border-[var(--border-color)] pb-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-[var(--text-primary)]">
                {editingTransaction
                  ? "Edit Catatan Transaksi"
                  : "Catat Transaksi Baru"}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-[var(--text-secondary)]">
                Simpan pemasukan atau pengeluaran dalam Rupiah (IDR).
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Tutup formulir transaksi"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Dialog.Close>
          </div>

          {open && (
            <TransactionFormBody
              key={formKey}
              editingTransaction={editingTransaction}
              defaultType={defaultType}
              onClose={() => onOpenChange(false)}
              onSaved={onSaved}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
