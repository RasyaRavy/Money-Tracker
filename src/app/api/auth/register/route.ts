import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb, seedDefaultCategoriesForUser } from "@/db";
import { users } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Nama lengkap minimal 2 karakter." },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Masukkan alamat email yang valid." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Kata sandi minimal 6 karakter." },
        { status: 400 }
      );
    }

    const db = getDb();
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Email tersebut sudah terdaftar. Silakan langsung masuk." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${crypto.randomUUID()}`;

    await db.insert(users).values({
      id: userId,
      email,
      name,
      image: null,
      passwordHash,
      provider: "credentials",
      createdAt: Date.now(),
    });

    await seedDefaultCategoriesForUser(userId);

    return NextResponse.json(
      { ok: true, user: { id: userId, email, name } },
      { status: 201 }
    );
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Gagal mendaftarkan akun. Pastikan koneksi PostgreSQL aktif." },
      { status: 500 }
    );
  }
}
