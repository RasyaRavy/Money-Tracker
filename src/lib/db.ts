import Dexie, { type EntityTable } from "dexie";
import type { Budget, Category, Transaction } from "./types";

export const DEFAULT_CATEGORIES: Category[] = [
  // Pemasukan (Income)
  {
    id: "cat_inc_gaji",
    name: "Gaji Utama",
    type: "income",
    icon: "Wallet",
    color: "#059669",
    isDefault: true,
    createdAt: 1700000001000,
  },
  {
    id: "cat_inc_bisnis",
    name: "Freelance & Usaha",
    type: "income",
    icon: "Briefcase",
    color: "#0d9488",
    isDefault: true,
    createdAt: 1700000002000,
  },
  {
    id: "cat_inc_investasi",
    name: "Hasil Investasi",
    type: "income",
    icon: "TrendingUp",
    color: "#2563eb",
    isDefault: true,
    createdAt: 1700000003000,
  },
  {
    id: "cat_inc_bonus",
    name: "Bonus & THR",
    type: "income",
    icon: "Gift",
    color: "#7c3aed",
    isDefault: true,
    createdAt: 1700000004000,
  },
  {
    id: "cat_inc_lainnya",
    name: "Pemasukan Lainnya",
    type: "income",
    icon: "Coins",
    color: "#475569",
    isDefault: true,
    createdAt: 1700000005000,
  },

  // Pengeluaran (Expense)
  {
    id: "cat_exp_makanan",
    name: "Makanan & Minuman",
    type: "expense",
    icon: "Utensils",
    color: "#e11d48",
    isDefault: true,
    createdAt: 1700000006000,
  },
  {
    id: "cat_exp_transportasi",
    name: "Transportasi",
    type: "expense",
    icon: "Car",
    color: "#d97706",
    isDefault: true,
    createdAt: 1700000007000,
  },
  {
    id: "cat_exp_tagihan",
    name: "Tagihan & Utilitas",
    type: "expense",
    icon: "Zap",
    color: "#0284c7",
    isDefault: true,
    createdAt: 1700000008000,
  },
  {
    id: "cat_exp_belanja",
    name: "Belanja Kebutuhan",
    type: "expense",
    icon: "ShoppingBag",
    color: "#9333ea",
    isDefault: true,
    createdAt: 1700000009000,
  },
  {
    id: "cat_exp_tempat_tinggal",
    name: "Tempat Tinggal",
    type: "expense",
    icon: "Home",
    color: "#4f46e5",
    isDefault: true,
    createdAt: 1700000010000,
  },
  {
    id: "cat_exp_kesehatan",
    name: "Kesehatan",
    type: "expense",
    icon: "HeartPulse",
    color: "#dc2626",
    isDefault: true,
    createdAt: 1700000011000,
  },
  {
    id: "cat_exp_hiburan",
    name: "Hiburan & Langganan",
    type: "expense",
    icon: "Film",
    color: "#db2777",
    isDefault: true,
    createdAt: 1700000012000,
  },
  {
    id: "cat_exp_pendidikan",
    name: "Pendidikan",
    type: "expense",
    icon: "GraduationCap",
    color: "#0891b2",
    isDefault: true,
    createdAt: 1700000013000,
  },
  {
    id: "cat_exp_lainnya",
    name: "Pengeluaran Lainnya",
    type: "expense",
    icon: "CircleEllipsis",
    color: "#64748b",
    isDefault: true,
    createdAt: 1700000014000,
  },
];

class MoneyTrackerDatabase extends Dexie {
  categories!: EntityTable<Category, "id">;
  transactions!: EntityTable<Transaction, "id">;
  budgets!: EntityTable<Budget, "id">;

  constructor() {
    super("MoneyTrackerDB");

    // Compound indices speed up monthly range queries and type filtering without full scans.
    this.version(1).stores({
      categories: "id, type, name, isDefault, createdAt",
      transactions: "id, date, type, categoryId, [date+type], [type+categoryId], createdAt",
      budgets: "id, month, categoryId, [month+categoryId]",
    });
  }
}

export const db = new MoneyTrackerDatabase();

let seedPromise: Promise<void> | null = null;

export async function ensureDefaultCategories(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!seedPromise) {
    seedPromise = (async () => {
      const count = await db.categories.count();
      if (count === 0) {
        await db.categories.bulkPut(DEFAULT_CATEGORIES);
      }
    })().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}
