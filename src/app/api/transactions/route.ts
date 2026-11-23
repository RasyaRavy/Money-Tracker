import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, transactions } from "@/db/schema";
import { requireAuthUser } from "@/lib/api-auth";

export async function POST(request: Request) {
  const authResult = await requireAuthUser();
  if ("response" in authResult) return authResult.response;

  try {
    const body = await request.json();
    const amount = Math.round(Number(body?.amount ?? 0));
    const type = body?.type === "income" ? "income" : body?.type === "expense" ? "expense" : null;
    const categoryId = String(body?.categoryId ?? "");
    const date = String(body?.date ?? "");
    const note = String(body?.note ?? "").trim().slice(0, 120);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Nominal harus lebih dari Rp 0." },
        { status: 400 }
      );
    }
    if (!type) {
      return NextResponse.json(
        { error: "Tipe transaksi tidak valid." },
        { status: 400 }
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Format tanggal tidak valid (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    const db = getDb();
    const catCheck = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.userId, authResult.userId)
        )
      )
      .limit(1);

    if (catCheck.length === 0) {
      return NextResponse.json(
        { error: "Kategori tidak ditemukan." },
        { status: 400 }
      );
    }

    const newTx = {
      id: `tx_${crypto.randomUUID()}`,
      userId: authResult.userId,
      amount,
      type,
      categoryId,
      date,
      note,
      createdAt: Date.now(),
    };

    await db.insert(transactions).values(newTx);

    return NextResponse.json({ transaction: newTx }, { status: 201 });
  } catch (err) {
    console.error("POST /api/transactions error:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan transaksi ke PostgreSQL." },
      { status: 500 }
    );
  }
}
