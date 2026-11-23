import type { Category, CSVImportResult, Transaction, TransactionType } from "./types";

const CSV_HEADERS = ["ID", "Tanggal", "Tipe", "Kategori", "Nominal", "Catatan"];

function escapeCSVField(field: string | number): string {
  const str = String(field ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === "," || char === ";") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export function exportTransactionsToCSV(
  transactions: Transaction[],
  categoriesMap: Map<string, Category>,
  filenamePrefix = "money-tracker-transaksi"
): void {
  const rows: string[] = [CSV_HEADERS.join(",")];

  for (const tx of transactions) {
    const categoryName = categoriesMap.get(tx.categoryId)?.name ?? "Lainnya";
    const typeLabel = tx.type === "income" ? "Pemasukan" : "Pengeluaran";
    const row = [
      escapeCSVField(tx.id),
      escapeCSVField(tx.date),
      escapeCSVField(typeLabel),
      escapeCSVField(categoryName),
      escapeCSVField(tx.amount),
      escapeCSVField(tx.note),
    ];
    rows.push(row.join(","));
  }

  // Prepend UTF-8 BOM so Microsoft Excel reads Indonesian characters and columns properly.
  const csvContent = "\uFEFF" + rows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.setAttribute("download", `${filenamePrefix}-${dateStamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCSVTemplate(): void {
  const sampleRows = [
    CSV_HEADERS.join(","),
    ",2026-11-01,Pemasukan,Gaji Utama,8500000,Gaji bulan November",
    ",2026-11-02,Pengeluaran,Makanan & Minuman,45000,Makan siang di warteg",
    ",2026-11-03,Pengeluaran,Transportasi,25000,Isi bensin motor",
  ];
  const csvContent = "\uFEFF" + sampleRows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "template-import-money-tracker.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function normalizeType(raw: string): TransactionType | null {
  const lower = raw.toLowerCase().trim();
  if (lower === "income" || lower === "pemasukan" || lower === "masuk") {
    return "income";
  }
  if (lower === "expense" || lower === "pengeluaran" || lower === "keluar") {
    return "expense";
  }
  return null;
}

function isValidISODate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(`${dateStr}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

export async function importTransactionsFromCSV(file: File): Promise<CSVImportResult> {
  const text = await file.text();
  const cleanText = text.replace(/^\uFEFF/, "");
  const lines = cleanText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) {
    return {
      importedCount: 0,
      skippedCount: 0,
      createdCategories: [],
      errors: ["File CSV kosong atau hanya berisi baris header."],
    };
  }

  const headerCols = parseCSVLine(lines[0]).map((c) => c.toLowerCase());
  const dateIdx = headerCols.findIndex((c) => c.includes("tanggal") || c === "date");
  const typeIdx = headerCols.findIndex((c) => c.includes("tipe") || c === "type" || c.includes("jenis"));
  const catIdx = headerCols.findIndex((c) => c.includes("kategori") || c === "category");
  const amountIdx = headerCols.findIndex((c) => c.includes("nominal") || c === "amount" || c.includes("jumlah"));
  const noteIdx = headerCols.findIndex((c) => c.includes("catatan") || c === "note" || c.includes("deskripsi"));

  if (dateIdx === -1 || typeIdx === -1 || amountIdx === -1) {
    return {
      importedCount: 0,
      skippedCount: lines.length - 1,
      createdCategories: [],
      errors: [
        "Format kolom CSV tidak dikenali. Pastikan terdapat header kolom: Tanggal, Tipe, Kategori, Nominal, Catatan.",
      ],
    };
  }

  const validRows: {
    date: string;
    type: TransactionType;
    categoryName: string;
    amount: number;
    note: string;
  }[] = [];
  const errors: string[] = [];
  let skippedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const rowNum = i + 1;

    const rawDate = cols[dateIdx] ?? "";
    const rawType = cols[typeIdx] ?? "";
    const rawCat = (catIdx !== -1 ? cols[catIdx] : "") || "Lainnya";
    const rawAmount = cols[amountIdx] ?? "";
    const rawNote = noteIdx !== -1 ? cols[noteIdx] ?? "" : "";

    if (!isValidISODate(rawDate)) {
      skippedCount++;
      errors.push(`Baris ${rowNum}: Format tanggal "${rawDate}" tidak valid (gunakan YYYY-MM-DD).`);
      continue;
    }

    const txType = normalizeType(rawType);
    if (!txType) {
      skippedCount++;
      errors.push(`Baris ${rowNum}: Tipe "${rawType}" tidak valid (gunakan Pemasukan atau Pengeluaran).`);
      continue;
    }

    const cleanDigits = rawAmount.replace(/[^\d-]/g, "");
    const parsedAmount = Math.abs(parseInt(cleanDigits, 10));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      skippedCount++;
      errors.push(`Baris ${rowNum}: Nominal "${rawAmount}" harus berupa angka lebih dari 0.`);
      continue;
    }

    validRows.push({
      date: rawDate,
      type: txType,
      categoryName: rawCat,
      amount: parsedAmount,
      note: rawNote,
    });
  }

  if (validRows.length === 0) {
    return {
      importedCount: 0,
      skippedCount,
      createdCategories: [],
      errors,
    };
  }

  const res = await fetch("/api/import-csv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows: validRows }),
  });

  const data = await res.json();
  if (!res.ok) {
    return {
      importedCount: 0,
      skippedCount: skippedCount + validRows.length,
      createdCategories: [],
      errors: [...errors, data?.error || "Gagal menyimpan hasil impor CSV ke PostgreSQL."],
    };
  }

  return {
    importedCount: data.importedCount ?? validRows.length,
    skippedCount,
    createdCategories: data.createdCategories ?? [],
    errors,
  };
}
