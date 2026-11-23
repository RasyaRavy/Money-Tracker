import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
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
    const name = String(body?.name ?? "").trim().slice(0, 40);
    const type = body?.type === "income" ? "income" : body?.type === "expense" ? "expense" : null;
    const icon = String(body?.icon ?? "CircleEllipsis");
    const color = String(body?.color ?? "#64748b");

    if (!name || !type) {
      return NextResponse.json(
        { error: "Nama dan jenis kategori wajib diisi." },
        { status: 400 }
      );
    }

    const db = getDb();
    const updated = await db
      .update(categories)
      .set({ name, type, icon, color })
      .where(
        and(
          eq(categories.id, id),
          eq(categories.userId, authResult.userId)
        )
      )
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Kategori tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ category: updated[0] });
  } catch (err) {
    console.error("PUT /api/categories/[id] error:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui kategori." },
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

    const allCats = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, authResult.userId));

    const target = allCats.find((c) => c.id === id);
    if (!target) {
      return NextResponse.json(
        { error: "Kategori tidak ditemukan." },
        { status: 404 }
      );
    }

    const sameTypeOthers = allCats.filter(
      (c) => c.type === target.type && c.id !== target.id
    );
    if (sameTypeOthers.length === 0) {
      return NextResponse.json(
        {
          error:
            "Tidak dapat menghapus kategori terakhir. Minimal harus ada 1 kategori untuk setiap jenis transaksi.",
        },
        { status: 400 }
      );
    }

    const fallback =
      sameTypeOthers.find((c) => c.name.toLowerCase().includes("lainnya")) ??
      sameTypeOthers[0];

    await db.transaction(async (tx) => {
      await tx
        .update(transactions)
        .set({ categoryId: fallback.id })
        .where(
          and(
            eq(transactions.userId, authResult.userId),
            eq(transactions.categoryId, target.id)
          )
        );

      await tx
        .delete(budgets)
        .where(
          and(
            eq(budgets.userId, authResult.userId),
            eq(budgets.categoryId, target.id)
          )
        );

      await tx
        .delete(categories)
        .where(
          and(
            eq(categories.id, target.id),
            eq(categories.userId, authResult.userId)
          )
        );
    });

    return NextResponse.json({ ok: true, fallbackName: fallback.name });
  } catch (err) {
    console.error("DELETE /api/categories/[id] error:", err);
    return NextResponse.json(
      { error: "Gagal menghapus kategori." },
      { status: 500 }
    );
  }
}
