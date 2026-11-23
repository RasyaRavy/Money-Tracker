import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categories } from "@/db/schema";
import { requireAuthUser } from "@/lib/api-auth";

export async function POST(request: Request) {
  const authResult = await requireAuthUser();
  if ("response" in authResult) return authResult.response;

  try {
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
    const existing = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.userId, authResult.userId),
          eq(categories.type, type)
        )
      );

    const dup = existing.some(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (dup) {
      return NextResponse.json(
        { error: `Kategori "${name}" sudah ada pada jenis transaksi ini.` },
        { status: 409 }
      );
    }

    const newCat = {
      id: `cat_${type}_${crypto.randomUUID().slice(0, 8)}`,
      userId: authResult.userId,
      name,
      type,
      icon,
      color,
      isDefault: false,
      createdAt: Date.now(),
    };

    await db.insert(categories).values(newCat);

    return NextResponse.json({ category: newCat }, { status: 201 });
  } catch (err) {
    console.error("POST /api/categories error:", err);
    return NextResponse.json(
      { error: "Gagal menambah kategori." },
      { status: 500 }
    );
  }
}
