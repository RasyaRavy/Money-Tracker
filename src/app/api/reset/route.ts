import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, seedDefaultCategoriesForUser } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { requireAuthUser } from "@/lib/api-auth";

export async function POST() {
  const authResult = await requireAuthUser();
  if ("response" in authResult) return authResult.response;

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx
        .delete(transactions)
        .where(eq(transactions.userId, authResult.userId));
      await tx.delete(budgets).where(eq(budgets.userId, authResult.userId));
      await tx
        .delete(categories)
        .where(eq(categories.userId, authResult.userId));
    });

    await seedDefaultCategoriesForUser(authResult.userId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/reset error:", err);
    return NextResponse.json(
      { error: "Gagal mengosongkan data buku kas." },
      { status: 500 }
    );
  }
}
