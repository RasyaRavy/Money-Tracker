import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function requireAuthUser(): Promise<
  | { userId: string; email: string; name: string; image: string | null }
  | { response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      response: NextResponse.json(
        { error: "Sesi belum aktif. Silakan masuk terlebih dahulu." },
        { status: 401 }
      ),
    };
  }
  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "Pengguna",
    image: session.user.image ?? null,
  };
}
