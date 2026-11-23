import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, seedDefaultCategoriesForUser } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { requireAuthUser } from "@/lib/api-auth";

export async function GET() {
  const authResult = await requireAuthUser();
  if ("response" in authResult) return authResult.response;

  try {
    const db = getDb();
    await seedDefaultCategoriesForUser(authResult.userId);

    const [userCategories, userTransactions, userBudgets] = await Promise.all([
      db
        .select()
        .from(categories)
        .where(eq(categories.userId, authResult.userId))
        .orderBy(asc(categories.createdAt)),
      db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, authResult.userId))
        .orderBy(desc(transactions.date), desc(transactions.createdAt)),
      db
        .select()
        .from(budgets)
        .where(eq(budgets.userId, authResult.userId)),
    ]);

    return NextResponse.json({
      user: {
        id: authResult.userId,
        name: authResult.name,
        email: authResult.email,
        image: authResult.image,
      },
      categories: userCategories,
      transactions: userTransactions,
      budgets: userBudgets,
    });
  } catch (err) {
    console.error("GET /api/bootstrap error:", err);
    return NextResponse.json(
      { error: "Gagal memuat data dari database PostgreSQL." },
      { status: 500 }
    );
  }
}
