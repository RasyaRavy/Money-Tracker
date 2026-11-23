import { NextResponse } from "next/server";
import { restoreDefaultCategoriesForUser } from "@/db";
import { requireAuthUser } from "@/lib/api-auth";

export async function POST() {
  const authResult = await requireAuthUser();
  if ("response" in authResult) return authResult.response;

  try {
    await restoreDefaultCategoriesForUser(authResult.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/categories/restore error:", err);
    return NextResponse.json(
      { error: "Gagal memulihkan kategori bawaan." },
      { status: 500 }
    );
  }
}
