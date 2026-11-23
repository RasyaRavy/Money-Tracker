import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, transactions } from "@/db/schema";
import { requireAuthUser } from "@/lib/api-auth";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const amount = Math.round(Number(body?.amount ?? 0));
    const type = body?.type === "income" ? "income" : body?.type === "expense" ? "expense" : null;
    const categoryId = String(body?.categoryId ?? "");
    const date = String(body?.date ?? "");
    const note = String(body?.note ?? "").trim().slice(0, 120);

    if (!Number.isFinite(amount) || amount <= 0 || !type || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Data transaksi tidak valid." },
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

    const updated = await db
      .update(transactions)
      .set({ amount, type, categoryId, date, note })
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.userId, authResult.userId)
        )
      )
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ transaction: updated[0] });
  } catch (err) {
    console.error("PUT /api/transactions/[id] error:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui transaksi." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { id } = await context.params;
    const db = getDb();
    await db
      .delete(transactions)
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.userId, authResult.userId)
        )
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/transactions/[id] error:", err);
    return NextResponse.json(
      { error: "Gagal menghapus transaksi." },
      { status: 500 }
    );
  }
}
