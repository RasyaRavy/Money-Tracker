import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { budgets } from "@/db/schema";
import { requireAuthUser } from "@/lib/api-auth";

export async function PUT(request: Request) {
  const authResult = await requireAuthUser();
  if ("response" in authResult) return authResult.response;

  try {
    const body = await request.json();
    const month = String(body?.month ?? "");
    const categoryId = String(body?.categoryId ?? "");
    const amount = Math.round(Number(body?.amount ?? 0));

    if (!/^\d{4}-\d{2}$/.test(month) || !categoryId) {
      return NextResponse.json(
        { error: "Bulan atau target kategori tidak valid." },
        { status: 400 }
      );
    }

    const db = getDb();
    const recordId = `${authResult.userId}_${month}_${categoryId}`;

    if (!Number.isFinite(amount) || amount <= 0) {
      await db
        .delete(budgets)
        .where(
          and(
            eq(budgets.userId, authResult.userId),
            eq(budgets.month, month),
            eq(budgets.categoryId, categoryId)
          )
        );
      return NextResponse.json({ ok: true, deleted: true });
    }

    const updatedAt = Date.now();
    await db
      .insert(budgets)
      .values({
        id: recordId,
        userId: authResult.userId,
        month,
        categoryId,
        amount,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: [budgets.userId, budgets.month, budgets.categoryId],
        set: { amount, updatedAt },
      });

    return NextResponse.json({
      budget: {
        id: recordId,
        month,
        categoryId,
        amount,
        updatedAt,
      },
    });
  } catch (err) {
    console.error("PUT /api/budgets error:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan anggaran bulanan." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const authResult = await requireAuthUser();
  if ("response" in authResult) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const month = String(searchParams.get("month") ?? "");
    const categoryId = String(searchParams.get("categoryId") ?? "");

    if (!month || !categoryId) {
      return NextResponse.json(
        { error: "Parameter month dan categoryId wajib diisi." },
        { status: 400 }
      );
    }

    const db = getDb();
    await db
      .delete(budgets)
      .where(
        and(
          eq(budgets.userId, authResult.userId),
          eq(budgets.month, month),
          eq(budgets.categoryId, categoryId)
        )
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/budgets error:", err);
    return NextResponse.json(
      { error: "Gagal menghapus batas anggaran." },
      { status: 500 }
    );
  }
}
