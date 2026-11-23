import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, seedDefaultCategoriesForUser } from "@/db";
import { categories, transactions } from "@/db/schema";
import { requireAuthUser } from "@/lib/api-auth";
import type { TransactionType } from "@/lib/types";

interface ImportRowInput {
  date: string;
  type: TransactionType;
  categoryName: string;
  amount: number;
  note: string;
}

export async function POST(request: Request) {
  const authResult = await requireAuthUser();
  if ("response" in authResult) return authResult.response;

  try {
    const body = await request.json();
    const rows: ImportRowInput[] = Array.isArray(body?.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada baris transaksi valid untuk diimpor." },
        { status: 400 }
      );
    }

    const db = getDb();
    await seedDefaultCategoriesForUser(authResult.userId);

    const existingCats = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, authResult.userId));

    const catByKey = new Map<string, string>();
    for (const c of existingCats) {
      catByKey.set(`${c.type}:${c.name.toLowerCase()}`, c.id);
    }

    const newCategories: {
      id: string;
      userId: string;
      name: string;
      type: string;
      icon: string;
      color: string;
      isDefault: boolean;
      createdAt: number;
    }[] = [];

    const createdCategories: string[] = [];
    const txValues: {
      id: string;
      userId: string;
      amount: number;
      type: string;
      categoryId: string;
      date: string;
      note: string;
      createdAt: number;
    }[] = [];

    const baseNow = Date.now();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const type: TransactionType = r.type === "income" ? "income" : "expense";
      const catName = String(r.categoryName || "Lainnya").trim().slice(0, 40);
      const key = `${type}:${catName.toLowerCase()}`;

      let catId = catByKey.get(key);
      if (!catId) {
        catId = `cat_${type}_${crypto.randomUUID().slice(0, 8)}`;
        catByKey.set(key, catId);
        createdCategories.push(catName);
        newCategories.push({
          id: catId,
          userId: authResult.userId,
          name: catName,
          type,
          icon: type === "income" ? "Coins" : "CircleEllipsis",
          color: type === "income" ? "#059669" : "#e11d48",
          isDefault: false,
          createdAt: baseNow + i,
        });
      }

      txValues.push({
        id: `tx_${crypto.randomUUID()}`,
        userId: authResult.userId,
        amount: Math.max(1, Math.round(Number(r.amount) || 0)),
        type,
        categoryId: catId,
        date: String(r.date),
        note: String(r.note ?? "").trim().slice(0, 120),
        createdAt: baseNow + i,
      });
    }

    await db.transaction(async (tx) => {
      if (newCategories.length > 0) {
        await tx.insert(categories).values(newCategories);
      }
      if (txValues.length > 0) {
        await tx.insert(transactions).values(txValues);
      }
    });

    return NextResponse.json({
      importedCount: txValues.length,
      createdCategories,
    });
  } catch (err) {
    console.error("POST /api/import-csv error:", err);
    return NextResponse.json(
      { error: "Gagal mengimpor data CSV ke PostgreSQL." },
      { status: 500 }
    );
  }
}
