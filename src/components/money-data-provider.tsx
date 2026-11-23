"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type {
  Budget,
  Category,
  CategoryIconName,
  Transaction,
  TransactionType,
} from "@/lib/types";

export interface AuthUserInfo {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface MoneyDataContextValue {
  user: AuthUserInfo | null;
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  saveTransaction: (payload: {
    id?: string;
    amount: number;
    type: TransactionType;
    categoryId: string;
    date: string;
    note: string;
  }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  saveCategory: (payload: {
    id?: string;
    name: string;
    type: TransactionType;
    icon: CategoryIconName;
    color: string;
  }) => Promise<void>;
  deleteCategory: (id: string) => Promise<{ fallbackName: string }>;
  restoreDefaultCategories: () => Promise<void>;
  saveBudget: (payload: {
    month: string;
    categoryId: string;
    amount: number;
  }) => Promise<void>;
  deleteBudget: (month: string, categoryId: string) => Promise<void>;
  resetAllData: () => Promise<void>;
}

const MoneyDataContext = createContext<MoneyDataContextValue | null>(null);

export function useMoneyData(): MoneyDataContextValue {
  const ctx = useContext(MoneyDataContext);
  if (!ctx) {
    throw new Error("useMoneyData harus digunakan di dalam MoneyDataProvider.");
  }
  return ctx;
}

export function MoneyDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";

  const [user, setUser] = useState<AuthUserInfo | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = !isLoginPage && !hasLoaded;

  const refreshData = useCallback(async () => {
    if (pathname === "/login") return;
    try {
      const res = await fetch("/api/bootstrap", { cache: "no-store" });
      if (res.status === 401) {
        setUser(null);
        setHasLoaded(true);
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Gagal memuat data buku kas.");
      }
      setError(null);
      setUser(data.user ?? null);
      setCategories(data.categories ?? []);
      setTransactions(data.transactions ?? []);
      setBudgets(data.budgets ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal terhubung ke server PostgreSQL."
      );
    } finally {
      setHasLoaded(true);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (isLoginPage) return;
    let cancelled = false;
    fetch("/api/bootstrap", { cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setUser(null);
          setHasLoaded(true);
          router.replace("/login");
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Gagal memuat data buku kas.");
        }
        setError(null);
        setUser(data.user ?? null);
        setCategories(data.categories ?? []);
        setTransactions(data.transactions ?? []);
        setBudgets(data.budgets ?? []);
        setHasLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Gagal terhubung ke server PostgreSQL."
        );
        setHasLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoginPage, router]);

  const saveTransaction = useCallback(
    async (payload: {
      id?: string;
      amount: number;
      type: TransactionType;
      categoryId: string;
      date: string;
      note: string;
    }) => {
      const url = payload.id
        ? `/api/transactions/${encodeURIComponent(payload.id)}`
        : "/api/transactions";
      const method = payload.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Gagal menyimpan transaksi.");
      }

      const savedTx: Transaction = data.transaction;
      setTransactions((prev) => {
        const exists = prev.some((t) => t.id === savedTx.id);
        const next = exists
          ? prev.map((t) => (t.id === savedTx.id ? savedTx : t))
          : [savedTx, ...prev];
        return next.sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return b.createdAt - a.createdAt;
        });
      });
    },
    []
  );

  const deleteTransaction = useCallback(async (id: string) => {
    const res = await fetch(`/api/transactions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Gagal menghapus transaksi.");
    }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const saveCategory = useCallback(
    async (payload: {
      id?: string;
      name: string;
      type: TransactionType;
      icon: CategoryIconName;
      color: string;
    }) => {
      const url = payload.id
        ? `/api/categories/${encodeURIComponent(payload.id)}`
        : "/api/categories";
      const method = payload.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Gagal menyimpan kategori.");
      }
      const savedCat: Category = data.category;
      setCategories((prev) => {
        const exists = prev.some((c) => c.id === savedCat.id);
        return exists
          ? prev.map((c) => (c.id === savedCat.id ? savedCat : c))
          : [...prev, savedCat];
      });
    },
    []
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<{ fallbackName: string }> => {
      const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Gagal menghapus kategori.");
      }
      await refreshData();
      return { fallbackName: data.fallbackName ?? "Lainnya" };
    },
    [refreshData]
  );

  const restoreDefaultCategories = useCallback(async () => {
    const res = await fetch("/api/categories/restore", { method: "POST" });
    if (!res.ok) {
      throw new Error("Gagal memulihkan kategori bawaan.");
    }
    await refreshData();
  }, [refreshData]);

  const saveBudget = useCallback(
    async (payload: { month: string; categoryId: string; amount: number }) => {
      const res = await fetch("/api/budgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Gagal menyimpan anggaran.");
      }

      if (data.deleted) {
        setBudgets((prev) =>
          prev.filter(
            (b) =>
              !(
                b.month === payload.month &&
                b.categoryId === payload.categoryId
              )
          )
        );
      } else if (data.budget) {
        const savedBudget: Budget = data.budget;
        setBudgets((prev) => {
          const exists = prev.some(
            (b) =>
              b.month === savedBudget.month &&
              b.categoryId === savedBudget.categoryId
          );
          return exists
            ? prev.map((b) =>
                b.month === savedBudget.month &&
                b.categoryId === savedBudget.categoryId
                  ? savedBudget
                  : b
              )
            : [...prev, savedBudget];
        });
      }
    },
    []
  );

  const deleteBudget = useCallback(
    async (month: string, categoryId: string) => {
      const res = await fetch(
        `/api/budgets?month=${encodeURIComponent(month)}&categoryId=${encodeURIComponent(categoryId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        throw new Error("Gagal menghapus batas anggaran.");
      }
      setBudgets((prev) =>
        prev.filter(
          (b) => !(b.month === month && b.categoryId === categoryId)
        )
      );
    },
    []
  );

  const resetAllData = useCallback(async () => {
    const res = await fetch("/api/reset", { method: "POST" });
    if (!res.ok) {
      throw new Error("Gagal mengosongkan data buku kas.");
    }
    await refreshData();
  }, [refreshData]);

  const value = useMemo<MoneyDataContextValue>(
    () => ({
      user,
      categories,
      transactions,
      budgets,
      isLoading,
      error,
      refreshData,
      saveTransaction,
      deleteTransaction,
      saveCategory,
      deleteCategory,
      restoreDefaultCategories,
      saveBudget,
      deleteBudget,
      resetAllData,
    }),
    [
      user,
      categories,
      transactions,
      budgets,
      isLoading,
      error,
      refreshData,
      saveTransaction,
      deleteTransaction,
      saveCategory,
      deleteCategory,
      restoreDefaultCategories,
      saveBudget,
      deleteBudget,
      resetAllData,
    ]
  );

  return (
    <MoneyDataContext.Provider value={value}>
      {children}
    </MoneyDataContext.Provider>
  );
}
