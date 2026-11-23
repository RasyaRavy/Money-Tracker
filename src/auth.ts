import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb, seedDefaultCategoriesForUser } from "@/db";
import { users } from "@/db/schema";

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

export const isGoogleAuthConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: THIRTY_DAYS_SECONDS, // 30 hari ("Ingat saya")
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(isGoogleAuthConfigured
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
          }),
        ]
      : []),
    Credentials({
      name: "Email & Kata Sandi",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Kata Sandi", type: "password" },
        rememberMe: { label: "Ingat saya", type: "text" },
      },
      async authorize(credentials) {
        const rawEmail = String(credentials?.email ?? "").trim().toLowerCase();
        const rawPassword = String(credentials?.password ?? "");

        if (!rawEmail || !rawPassword) return null;

        const db = getDb();
        const found = await db
          .select()
          .from(users)
          .where(eq(users.email, rawEmail))
          .limit(1);

        const user = found[0];
        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(rawPassword, user.passwordHash);
        if (!isValid) return null;

        await seedDefaultCategoriesForUser(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const normalizedEmail = user.email.trim().toLowerCase();
        const db = getDb();

        const existing = await db
          .select()
          .from(users)
          .where(eq(users.email, normalizedEmail))
          .limit(1);

        let dbUserId: string;
        if (existing.length === 0) {
          dbUserId = `usr_${crypto.randomUUID()}`;
          await db.insert(users).values({
            id: dbUserId,
            email: normalizedEmail,
            name: user.name?.trim() || normalizedEmail.split("@")[0],
            image: user.image ?? null,
            passwordHash: null,
            provider: "google",
            createdAt: Date.now(),
          });
        } else {
          dbUserId = existing[0].id;
          // Refresh Google display name / avatar if updated
          if (user.name || user.image) {
            await db
              .update(users)
              .set({
                name: user.name?.trim() || existing[0].name,
                image: user.image ?? existing[0].image,
              })
              .where(eq(users.id, dbUserId));
          }
        }

        await seedDefaultCategoriesForUser(dbUserId);
        user.id = dbUserId;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = String(token.userId);
      }
      return session;
    },
  },
});
