import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import type { CategoryIconName, TransactionType } from "@/lib/types";

const globalForPg = globalThis as unknown as {
  pgPool?: Pool;
};

function getPool(): Pool {
  if (!globalForPg.pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL belum diatur. Tambahkan DATABASE_URL pada file .env.local atau Environment Variables Vercel."
      );
    }
    const isLocal =
      connectionString.includes("localhost") ||
      connectionString.includes("127.0.0.1");

    globalForPg.pgPool = new Pool({
      connectionString,
      max: 10,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
  }
  return globalForPg.pgPool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}

export const DEFAULT_CATEGORY_TEMPLATES: {
  slug: string;
  name: string;
  type: TransactionType;
  icon: CategoryIconName;
  color: string;
}[] = [
  { slug: "inc_gaji", name: "Gaji Utama", type: "income", icon: "Wallet", color: "#059669" },
  { slug: "inc_bisnis", name: "Freelance & Usaha", type: "income", icon: "Briefcase", color: "#0d9488" },
  { slug: "inc_investasi", name: "Hasil Investasi", type: "income", icon: "TrendingUp", color: "#2563eb" },
  { slug: "inc_bonus", name: "Bonus & THR", type: "income", icon: "Gift", color: "#7c3aed" },
  { slug: "inc_lainnya", name: "Pemasukan Lainnya", type: "income", icon: "Coins", color: "#475569" },
  { slug: "exp_makanan", name: "Makanan & Minuman", type: "expense", icon: "Utensils", color: "#e11d48" },
  { slug: "exp_transportasi", name: "Transportasi", type: "expense", icon: "Car", color: "#d97706" },
  { slug: "exp_tagihan", name: "Tagihan & Utilitas", type: "expense", icon: "Zap", color: "#0284c7" },
  { slug: "exp_belanja", name: "Belanja Kebutuhan", type: "expense", icon: "ShoppingBag", color: "#9333ea" },
  { slug: "exp_tempat_tinggal", name: "Tempat Tinggal", type: "expense", icon: "Home", color: "#4f46e5" },
  { slug: "exp_kesehatan", name: "Kesehatan", type: "expense", icon: "HeartPulse", color: "#dc2626" },
  { slug: "exp_hiburan", name: "Hiburan & Langganan", type: "expense", icon: "Film", color: "#db2777" },
  { slug: "exp_pendidikan", name: "Pendidikan", type: "expense", icon: "GraduationCap", color: "#0891b2" },
  { slug: "exp_lainnya", name: "Pengeluaran Lainnya", type: "expense", icon: "CircleEllipsis", color: "#64748b" },
];

export async function seedDefaultCategoriesForUser(userId: string) {
  const db = getDb();
  const existing = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(eq(schema.categories.userId, userId));

  if (existing.length > 0) return;

  const baseTime = Date.now();
  const rows = DEFAULT_CATEGORY_TEMPLATES.map((tpl, index) => ({
    id: `cat_${userId.slice(0, 8)}_${tpl.slug}`,
    userId,
    name: tpl.name,
    type: tpl.type,
    icon: tpl.icon,
    color: tpl.color,
    isDefault: true,
    createdAt: baseTime + index,
  }));

  await db.insert(schema.categories).values(rows).onConflictDoNothing();
}

export async function restoreDefaultCategoriesForUser(userId: string) {
  const db = getDb();
  const baseTime = Date.now();
  const rows = DEFAULT_CATEGORY_TEMPLATES.map((tpl, index) => ({
    id: `cat_${userId.slice(0, 8)}_${tpl.slug}`,
    userId,
    name: tpl.name,
    type: tpl.type,
    icon: tpl.icon,
    color: tpl.color,
    isDefault: true,
    createdAt: baseTime + index,
  }));

  await db.insert(schema.categories).values(rows).onConflictDoNothing();
}
