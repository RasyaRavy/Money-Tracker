"use client";

import React, { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Wallet,
  Target,
  PieChart,
  Smartphone,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const PRODUCT_HIGHLIGHTS = [
  {
    icon: Wallet,
    title: "Pencatatan Rupiah Instan",
    desc: "Input nominal otomatis terformat titik ribuan dengan 14 kategori bawaan.",
  },
  {
    icon: Target,
    title: "Kendali Anggaran Bulanan",
    desc: "Pantau plafon pengeluaran per kategori dengan indikator status aman hingga overbudget.",
  },
  {
    icon: PieChart,
    title: "Laporan & Ekspor CSV",
    desc: "Ringkasan surplus/defisit, proporsi kategori, dan cadangan file CSV kapan saja.",
  },
  {
    icon: Smartphone,
    title: "Sinkron di HP & Laptop",
    desc: "Catat di mana saja dan buka kembali dari perangkat lain dengan akun yang sama.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [googleEnabled, setGoogleEnabled] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => {
        if (data?.authenticated) {
          router.replace("/");
          return;
        }
        setGoogleEnabled(Boolean(data?.googleEnabled));
      })
      .catch(() => {
        // Ignore status check error during initial load
      });
  }, [router]);

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    if (!googleEnabled) {
      setErrorMessage(
        "Login Google belum dikonfigurasi. Isi AUTH_GOOGLE_ID dan AUTH_GOOGLE_SECRET di .env.local atau Vercel Environment Variables."
      );
      return;
    }
    setIsGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setErrorMessage("Gagal memulai autentikasi Google.");
      setIsGoogleLoading(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      if (mode === "register") {
        const regRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const regData = await regRes.json();
        if (!regRes.ok) {
          setErrorMessage(regData?.error || "Gagal mendaftarkan akun baru.");
          setIsSubmitting(false);
          return;
        }
      }

      const signInRes = await signIn("credentials", {
        email,
        password,
        rememberMe: rememberMe ? "true" : "false",
        redirect: false,
      });

      if (signInRes?.error) {
        setErrorMessage("Email atau kata sandi salah. Silakan periksa kembali.");
        setIsSubmitting(false);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setErrorMessage("Terjadi kesalahan saat menghubungi server.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)] lg:grid lg:grid-cols-12">
      {/* Subtle Static Emerald Backdrop Glow (Clean, zero perpetual loop) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="auth-ambient-blob absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-[var(--accent-primary)]/[0.07] blur-3xl" />
        <div className="auth-ambient-blob-delayed absolute -bottom-28 right-[-80px] h-[380px] w-[380px] rounded-full bg-[var(--accent-primary)]/[0.06] blur-3xl" />
      </div>

      {/* Floating Minimal Theme Toggle (Top-Right) */}
      <div className="fixed right-4 top-4 z-20 flex items-center">
        <ThemeToggle iconOnly />
      </div>

      {/* Left Brand & Editorial Cashbook Panel (Desktop lg:col-span-6) */}
      <section
        aria-label="Informasi aplikasi Money Tracker"
        className="relative z-10 hidden lg:col-span-6 lg:flex lg:flex-col lg:justify-between lg:border-r lg:border-[var(--border-color)] lg:bg-[var(--bg-surface)]/85 lg:p-10 xl:p-14"
      >
        {/* Top Brand Identity */}
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] shadow-sm">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                Money Tracker
              </span>
              <span className="rounded border border-[var(--border-color)] bg-[var(--bg-page)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--text-secondary)]">
                IDR
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Buku Kas Pribadi Modern
            </p>
          </div>
        </div>

        {/* Center Editorial Pitch & Feature List */}
        <div className="my-auto max-w-lg py-10">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-[var(--text-primary)] xl:text-4xl">
            Catat arus kas harian dengan tenang, rapi, dan terukur.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            Kelola pemasukan, pengeluaran, dan batas anggaran bulanan dalam satu buku kas pribadi yang ringan di browser maupun layar utama HP Anda.
          </p>

          <div className="mt-8 space-y-4 border-t border-dashed border-[var(--border-color)] pt-7">
            {PRODUCT_HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] text-[var(--accent-primary)]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Clean Footnote (Only "Money Tracker" — no PWA/PostgreSQL technical text) */}
        <div className="flex items-center justify-between border-t border-dashed border-[var(--border-color)] pt-5 text-xs text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">
            Money Tracker
          </span>
          <span className="font-mono">Mata Uang: Rupiah (IDR)</span>
        </div>
      </section>

      {/* Right Interactive Auth Form Panel (lg:col-span-6, No Mobile Header Bar) */}
      <div className="relative z-10 flex flex-1 flex-col lg:col-span-6">
        <main
          id="main-content"
          className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-4 pb-10 pt-20 sm:px-6 lg:py-12"
        >
          {/* Compact Brand Mark on Mobile/Tablet (No full-width navbar) */}
          <div className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] shadow-sm">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
              Money Tracker
            </span>
          </div>

          {/* Mode Switcher Pill */}
          <div
            role="tablist"
            aria-label="Pilih mode masuk atau daftar"
            className="mb-5 grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-1.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => {
                setMode("login");
                setErrorMessage("");
              }}
              className={cn(
                "min-h-[42px] rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                mode === "login"
                  ? "bg-[var(--bg-subtle)] text-[var(--text-primary)] ring-1 ring-[var(--border-color)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Masuk ke Akun
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              onClick={() => {
                setMode("register");
                setErrorMessage("");
              }}
              className={cn(
                "min-h-[42px] rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                mode === "register"
                  ? "bg-[var(--bg-subtle)] text-[var(--text-primary)] ring-1 ring-[var(--border-color)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Daftar Akun Baru
            </button>
          </div>

          {/* Auth Card */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 shadow-sm sm:p-8">
            <div className="border-b border-dashed border-[var(--border-color)] pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {mode === "login"
                  ? "Selamat datang kembali"
                  : "Buat buku kas baru"}
              </h1>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                {mode === "login"
                  ? "Masuk untuk mengakses saldo, riwayat transaksi, dan anggaran bulanan Anda."
                  : "Daftar dalam hitungan detik. 14 kategori keuangan bawaan langsung disiapkan otomatis."}
              </p>
            </div>

            {/* Primary Google OAuth Action */}
            <div className="mt-5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] active:translate-y-[1px] disabled:opacity-60"
              >
                {isGoogleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <svg
                    className="h-4 w-4 shrink-0"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                <span>
                  {mode === "login"
                    ? "Lanjutkan dengan Google"
                    : "Daftar dengan Google"}
                </span>
              </button>
            </div>

            {/* Clean Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 border-t border-dashed border-[var(--border-color)]" />
              <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                atau lanjutkan dengan email
              </span>
              <div className="h-px flex-1 border-t border-dashed border-[var(--border-color)]" />
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label
                    htmlFor="auth-name"
                    className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]"
                  >
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
                      aria-hidden="true"
                    />
                    <input
                      id="auth-name"
                      type="text"
                      required
                      minLength={2}
                      autoComplete="name"
                      placeholder="Nama Anda"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-12 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] py-2 pl-10 pr-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/55"
                    />
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]"
                >
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] py-2 pl-10 pr-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/55"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]"
                >
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] py-2 pl-10 pr-12 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/55"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? "Sembunyikan kata sandi"
                        : "Tampilkan kata sandi"
                    }
                    title={
                      showPassword
                        ? "Sembunyikan kata sandi"
                        : "Tampilkan kata sandi"
                    }
                    className="absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Clean Remember Me (no verbose 30-day explanation) */}
              <label className="inline-flex items-center gap-2.5 pt-0.5 text-xs font-medium text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 shrink-0 rounded accent-[var(--accent-primary)]"
                />
                <span>Ingat saya</span>
              </label>

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-xl border border-[var(--color-expense)] bg-[var(--color-expense-bg)] px-3.5 py-3 text-xs font-medium leading-relaxed text-[var(--color-expense)]"
                >
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-3 text-sm font-semibold text-[var(--accent-primary-fg)] shadow-sm transition-colors hover:bg-[var(--accent-primary-hover)] active:translate-y-[1px] disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : mode === "login" ? (
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                )}
                <span>
                  {isSubmitting
                    ? "Memproses..."
                    : mode === "login"
                    ? "Masuk ke Buku Kas"
                    : "Buat Akun & Masuk"}
                </span>
              </button>
            </form>

            {/* Quick Mode Switch Footer */}
            <p className="mt-5 text-center text-xs text-[var(--text-secondary)]">
              {mode === "login" ? (
                <>
                  Belum punya akun?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setErrorMessage("");
                    }}
                    className="font-semibold text-[var(--accent-primary)] hover:underline"
                  >
                    Daftar sekarang
                  </button>
                </>
              ) : (
                <>
                  Sudah punya akun?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setErrorMessage("");
                    }}
                    className="font-semibold text-[var(--accent-primary)] hover:underline"
                  >
                    Masuk di sini
                  </button>
                </>
              )}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
