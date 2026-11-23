"use client";

import React, { useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  RotateCcw,
  X,
  Check,
} from "lucide-react";
import { useMoneyData } from "@/components/money-data-provider";
import {
  downloadCSVTemplate,
  exportTransactionsToCSV,
  importTransactionsFromCSV,
} from "@/lib/csv";
import type {
  Category,
  CategoryIconName,
  CSVImportResult,
  TransactionType,
} from "@/lib/types";
import {
  CATEGORY_COLOR_OPTIONS,
  CATEGORY_ICON_OPTIONS,
  CategoryIcon,
} from "@/components/category-icon";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const {
    categories,
    transactions,
    budgets,
    isLoading,
    saveCategory,
    deleteCategory,
    restoreDefaultCategories,
    resetAllData,
    refreshData,
  } = useMoneyData();
  const [activeTab, setActiveTab] = useState<TransactionType>("expense");

  // Category Dialog State
  const [catDialogOpen, setCatDialogOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState<string>("");
  const [catType, setCatType] = useState<TransactionType>("expense");
  const [catIcon, setCatIcon] = useState<CategoryIconName>("Utensils");
  const [catColor, setCatColor] = useState<string>("#e11d48");
  const [catError, setCatError] = useState<string>("");

  // Category deletion confirmation
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  // CSV Import State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);

  // Reset confirmation
  const [confirmResetAll, setConfirmResetAll] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string>("");

  const categoriesMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) {
      map.set(c.id, c);
    }
    return map;
  }, [categories]);

  const txCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tx of transactions) {
      counts.set(tx.categoryId, (counts.get(tx.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [transactions]);

  const displayedCategories = useMemo(() => {
    return categories.filter((c) => c.type === activeTab);
  }, [categories, activeTab]);

  const openCreateCategory = (type: TransactionType) => {
    setEditingCategory(null);
    setCatName("");
    setCatType(type);
    setCatIcon(type === "income" ? "Wallet" : "Utensils");
    setCatColor(type === "income" ? "#059669" : "#e11d48");
    setCatError("");
    setCatDialogOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatType(cat.type);
    setCatIcon(cat.icon);
    setCatColor(cat.color);
    setCatError("");
    setCatDialogOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = catName.trim();
    if (!trimmed) {
      setCatError("Nama kategori tidak boleh kosong.");
      return;
    }

    try {
      await saveCategory({
        id: editingCategory?.id,
        name: trimmed,
        type: catType,
        icon: catIcon,
        color: catColor,
      });
      setActiveTab(catType);
      setCatDialogOpen(false);
      setStatusNotice(
        editingCategory
          ? `Kategori "${trimmed}" diperbarui.`
          : `Kategori baru "${trimmed}" ditambahkan.`
      );
    } catch (err) {
      setCatError(
        err instanceof Error ? err.message : "Gagal menyimpan kategori."
      );
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    try {
      const res = await deleteCategory(cat.id);
      setDeletingCatId(null);
      setStatusNotice(
        `Kategori "${cat.name}" dihapus. Transaksi terkait dialihkan ke "${res.fallbackName}".`
      );
    } catch (err) {
      setDeletingCatId(null);
      setStatusNotice(
        err instanceof Error ? err.message : "Gagal menghapus kategori."
      );
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);
    try {
      const res = await importTransactionsFromCSV(file);
      setImportResult(res);
      if (res.importedCount > 0) {
        await refreshData();
      }
    } catch {
      setImportResult({
        importedCount: 0,
        skippedCount: 0,
        createdCategories: [],
        errors: ["Gagal membaca file CSV. Pastikan file berformat teks CSV standar."],
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRestoreDefaults = async () => {
    await restoreDefaultCategories();
    setStatusNotice("Kategori bawaan telah dipulihkan.");
  };

  const handleClearAllData = async () => {
    await resetAllData();
    setConfirmResetAll(false);
    setImportResult(null);
    setStatusNotice(
      "Seluruh data transaksi dan anggaran telah dikosongkan, dan kategori bawaan telah diatur ulang."
    );
  };

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6"
      >
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          Memuat pengaturan kategori dan data CSV dari PostgreSQL...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Kategori & Pengelolaan Data CSV
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Sesuaikan kategori pemasukan dan pengeluaran, atau ekspor dan impor riwayat transaksi melalui file CSV.
        </p>
      </div>

      {statusNotice && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between rounded-lg border border-[var(--color-income)] bg-[var(--color-income-bg)] px-4 py-2.5 text-xs font-medium text-[var(--color-income)]"
        >
          <span>{statusNotice}</span>
          <button
            type="button"
            onClick={() => setStatusNotice("")}
            aria-label="Tutup pemberitahuan"
            className="ml-3 rounded p-1 hover:bg-black/10"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Focal Point: Two-column asymmetric layout on desktop */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Category CRUD Manager (7 columns) */}
        <section
          aria-labelledby="category-manager-heading"
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6 lg:col-span-7"
        >
          <div className="flex flex-col gap-3 border-b border-dashed border-[var(--border-color)] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                id="category-manager-heading"
                className="text-base font-semibold text-[var(--text-primary)]"
              >
                Kelola Kategori Transaksi
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Tambah, ubah ikon/warna, atau hapus kategori.
              </p>
            </div>

            <button
              type="button"
              onClick={() => openCreateCategory(activeTab)}
              className="inline-flex min-h-[44px] items-center gap-2 self-start rounded-lg bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-semibold text-[var(--accent-primary-fg)] hover:bg-[var(--accent-primary-hover)] sm:self-auto"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Tambah Kategori</span>
            </button>
          </div>

          {/* Type Switcher */}
          <div
            role="tablist"
            aria-label="Pilih tipe kategori"
            className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "expense"}
              onClick={() => setActiveTab("expense")}
              className={cn(
                "min-h-[40px] rounded-md px-3 py-2 text-xs font-semibold transition-colors",
                activeTab === "expense"
                  ? "bg-[var(--bg-surface)] text-[var(--color-expense)] shadow-2xs ring-1 ring-[var(--border-color)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Kategori Pengeluaran (
              {categories.filter((c) => c.type === "expense").length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "income"}
              onClick={() => setActiveTab("income")}
              className={cn(
                "min-h-[40px] rounded-md px-3 py-2 text-xs font-semibold transition-colors",
                activeTab === "income"
                  ? "bg-[var(--bg-surface)] text-[var(--color-income)] shadow-2xs ring-1 ring-[var(--border-color)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Kategori Pemasukan (
              {categories.filter((c) => c.type === "income").length})
            </button>
          </div>

          {/* Category List */}
          <ul className="mt-4 divide-y divide-dashed divide-[var(--border-color)]">
            {displayedCategories.map((cat) => {
              const usedCount = txCountByCategory.get(cat.id) ?? 0;
              const isConfirming = deletingCatId === cat.id;

              return (
                <li
                  key={cat.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: cat.color }}
                    >
                      <CategoryIcon name={cat.icon} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {cat.name}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Digunakan pada {usedCount} transaksi
                      </p>
                    </div>
                  </div>

                  {isConfirming ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        className="min-h-[44px] rounded-lg bg-[var(--color-expense)] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Ya, Hapus
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCatId(null)}
                        className="min-h-[44px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)]"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => openEditCategory(cat)}
                        aria-label={`Edit kategori ${cat.name}`}
                        title="Edit kategori"
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCatId(cat.id)}
                        aria-label={`Hapus kategori ${cat.name}`}
                        title="Hapus kategori"
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--color-expense-bg)] hover:text-[var(--color-expense)]"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-4 border-t border-dashed border-[var(--border-color)] pt-4">
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Pulihkan Kategori Bawaan yang Terhapus</span>
            </button>
          </div>
        </section>

        {/* Right Column: CSV Export, Import, & Reset Data (5 columns) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Export & Import CSV Card */}
          <section
            aria-labelledby="csv-data-heading"
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6"
          >
            <div className="border-b border-dashed border-[var(--border-color)] pb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet
                  className="h-5 w-5 text-[var(--accent-primary)]"
                  aria-hidden="true"
                />
                <h2
                  id="csv-data-heading"
                  className="text-base font-semibold text-[var(--text-primary)]"
                >
                  Ekspor & Impor Transaksi (CSV)
                </h2>
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Cadangkan seluruh riwayat transaksi ke Excel/Spreadsheet atau impor dari file CSV.
              </p>
            </div>

            {/* Export Block */}
            <div className="mt-4 space-y-2.5">
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                1. Ekspor Data ke CSV
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Total transaksi tersimpan saat ini:{" "}
                <span className="font-mono font-bold text-[var(--text-primary)]">
                  {transactions.length}
                </span>{" "}
                baris.
              </p>
              <button
                type="button"
                disabled={transactions.length === 0}
                onClick={() =>
                  exportTransactionsToCSV(
                    transactions,
                    categoriesMap,
                    "money-tracker-semua-transaksi"
                  )
                }
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-50"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>
                  {transactions.length > 0
                    ? `Unduh Semua Transaksi (${transactions.length} Baris)`
                    : "Belum Ada Transaksi untuk Diekspor"}
                </span>
              </button>
            </div>

            {/* Import Block */}
            <div className="mt-6 space-y-3 border-t border-dashed border-[var(--border-color)] pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                  2. Impor Data dari CSV
                </h3>
                <button
                  type="button"
                  onClick={downloadCSVTemplate}
                  className="inline-flex min-h-[36px] items-center text-xs font-semibold text-[var(--accent-primary)] hover:underline"
                >
                  Unduh Contoh Template CSV
                </button>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Kolom wajib: <span className="font-mono">Tanggal</span> (YYYY-MM-DD),{" "}
                <span className="font-mono">Tipe</span> (Pemasukan/Pengeluaran),{" "}
                <span className="font-mono">Kategori</span>,{" "}
                <span className="font-mono">Nominal</span>, dan{" "}
                <span className="font-mono">Catatan</span>.
              </p>

              <div>
                <label
                  htmlFor="csv-file-upload"
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2.5 text-xs font-semibold text-[var(--accent-primary-fg)] transition-colors hover:bg-[var(--accent-primary-hover)]"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {isImporting ? "Memproses File CSV..." : "Pilih File CSV untuk Diimpor"}
                  </span>
                </label>
                <input
                  ref={fileInputRef}
                  id="csv-file-upload"
                  type="file"
                  accept=".csv,text/csv"
                  disabled={isImporting}
                  onChange={handleCSVUpload}
                  className="sr-only"
                />
              </div>

              {importResult && (
                <div
                  role="region"
                  aria-label="Hasil impor CSV"
                  className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] p-3.5 text-xs"
                >
                  <p className="font-semibold text-[var(--text-primary)]">
                    Ringkasan Impor CSV:
                  </p>
                  <ul className="mt-1.5 space-y-1 text-[var(--text-secondary)]">
                    <li>
                      Berhasil diimpor:{" "}
                      <span className="font-mono font-bold text-[var(--color-income)]">
                        {importResult.importedCount}
                      </span>{" "}
                      transaksi
                    </li>
                    {importResult.skippedCount > 0 && (
                      <li>
                        Dilewati karena tidak valid:{" "}
                        <span className="font-mono font-bold text-[var(--color-expense)]">
                          {importResult.skippedCount}
                        </span>{" "}
                        baris
                      </li>
                    )}
                    {importResult.createdCategories.length > 0 && (
                      <li>
                        Kategori baru dibuat otomatis:{" "}
                        <span className="font-medium text-[var(--text-primary)]">
                          {importResult.createdCategories.join(", ")}
                        </span>
                      </li>
                    )}
                  </ul>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 border-t border-dashed border-[var(--border-color)] pt-2 text-[var(--color-expense)]">
                      <p className="font-semibold">Peringatan Validasi:</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4">
                        {importResult.errors.slice(0, 5).map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Danger Zone: Reset Database */}
          <section
            aria-labelledby="reset-data-heading"
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6"
          >
            <h2
              id="reset-data-heading"
              className="text-sm font-semibold text-[var(--text-primary)]"
            >
              Atur Ulang Data Buku Kas
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Menghapus seluruh transaksi dan anggaran akun Anda dari database PostgreSQL. Pastikan Anda sudah mengekspor file CSV jika masih membutuhkan datanya.
            </p>

            {confirmResetAll ? (
              <div className="mt-4 rounded-lg border border-[var(--color-expense)] bg-[var(--color-expense-bg)] p-3.5">
                <p className="text-xs font-semibold text-[var(--color-expense)]">
                  Yakin ingin menghapus seluruh {transactions.length} transaksi dan{" "}
                  {budgets.length} anggaran?
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearAllData}
                    className="min-h-[44px] rounded-lg bg-[var(--color-expense)] px-3.5 py-2 text-xs font-semibold text-white"
                  >
                    Ya, Kosongkan Semua Data
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetAll(false)}
                    className="min-h-[44px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)]"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmResetAll(true)}
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[var(--color-expense)] bg-[var(--color-expense-bg)] px-4 py-2 text-xs font-semibold text-[var(--color-expense)]"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Kosongkan Buku Kas</span>
              </button>
            )}
          </section>
        </div>
      </div>

      {/* Modal Tambah / Edit Kategori */}
      <Dialog.Root open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 shadow-lg sm:p-6">
            <div className="flex items-center justify-between border-b border-dashed border-[var(--border-color)] pb-3">
              <Dialog.Title className="text-base font-bold text-[var(--text-primary)]">
                {editingCategory ? "Edit Kategori" : "Tambah Kategori Baru"}
              </Dialog.Title>
              <Dialog.Close
                aria-label="Tutup dialog kategori"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Dialog.Close>
            </div>

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="cat-name-input"
                  className="mb-1 block text-xs font-medium text-[var(--text-secondary)]"
                >
                  Nama Kategori
                </label>
                <input
                  id="cat-name-input"
                  type="text"
                  required
                  maxLength={40}
                  placeholder="Contoh: Kopi & Camilan"
                  value={catName}
                  onChange={(e) => {
                    setCatName(e.target.value);
                    if (catError) setCatError("");
                  }}
                  className="min-h-[44px] w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label
                  htmlFor="cat-type-select"
                  className="mb-1 block text-xs font-medium text-[var(--text-secondary)]"
                >
                  Jenis Transaksi
                </label>
                <select
                  id="cat-type-select"
                  value={catType}
                  onChange={(e) => setCatType(e.target.value as TransactionType)}
                  className="min-h-[44px] w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)]"
                >
                  <option value="expense">Pengeluaran</option>
                  <option value="income">Pemasukan</option>
                </select>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                  Pilih Ikon
                </label>
                <div
                  role="radiogroup"
                  aria-label="Pilih ikon kategori"
                  className="grid grid-cols-6 gap-2"
                >
                  {CATEGORY_ICON_OPTIONS.map((opt) => {
                    const selected = catIcon === opt.name;
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={opt.label}
                        title={opt.label}
                        onClick={() => setCatIcon(opt.name)}
                        className={cn(
                          "flex min-h-[44px] items-center justify-center rounded-lg border transition-colors",
                          selected
                            ? "border-[var(--text-primary)] bg-[var(--bg-subtle)] text-[var(--text-primary)] ring-1 ring-[var(--text-primary)]"
                            : "border-[var(--border-color)] bg-[var(--bg-page)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        <CategoryIcon name={opt.name} className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                  Pilih Warna Kategori
                </label>
                <div
                  role="radiogroup"
                  aria-label="Pilih warna kategori"
                  className="grid grid-cols-6 gap-2"
                >
                  {CATEGORY_COLOR_OPTIONS.map((c) => {
                    const selected = catColor === c.hex;
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={c.label}
                        title={c.label}
                        onClick={() => setCatColor(c.hex)}
                        className={cn(
                          "flex min-h-[44px] items-center justify-center rounded-lg border",
                          selected
                            ? "border-[var(--text-primary)] ring-2 ring-[var(--text-primary)]"
                            : "border-transparent"
                        )}
                        style={{ backgroundColor: c.hex }}
                      >
                        {selected && (
                          <Check className="h-4 w-4 text-white" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {catError && (
                <div
                  role="alert"
                  className="rounded-lg border border-[var(--color-expense)] bg-[var(--color-expense-bg)] px-3 py-2 text-xs font-medium text-[var(--color-expense)]"
                >
                  {catError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-dashed border-[var(--border-color)] pt-4">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="min-h-[44px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-medium text-[var(--text-primary)]"
                  >
                    Batal
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-primary-fg)]"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span>Simpan Kategori</span>
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
