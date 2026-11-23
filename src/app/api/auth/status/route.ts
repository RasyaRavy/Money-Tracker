import { NextResponse } from "next/server";
import { auth, isGoogleAuthConfigured } from "@/auth";

export async function GET() {
  const session = await auth();
  return NextResponse.json({
    authenticated: Boolean(session?.user?.id),
    user: session?.user ?? null,
    googleEnabled: isGoogleAuthConfigured,
  });
}
