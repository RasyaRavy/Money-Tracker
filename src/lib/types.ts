export type TransactionType = "income" | "expense";

export type CategoryIconName =
  | "Wallet"
  | "Briefcase"
  | "TrendingUp"
  | "Gift"
  | "Coins"
  | "Utensils"
  | "Car"
  | "Zap"
  | "ShoppingBag"
  | "Film"
  | "HeartPulse"
  | "GraduationCap"
  | "Home"
  | "Smartphone"
  | "Coffee"
  | "Plane"
  | "Wrench"
  | "CircleEllipsis";

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: CategoryIconName;
  color: string;
  isDefault: boolean;
  createdAt: number;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  date: string; // YYYY-MM-DD
  note: string;
  createdAt: number;
}

export interface Budget {
  id: string; // `${month}_${categoryId}` or `${month}_TOTAL`
  month: string; // YYYY-MM
  categoryId: string; // "TOTAL" or Category["id"]
  amount: number;
  updatedAt: number;
}

export type ChartPeriod = "weekly" | "monthly" | "yearly";

export interface CSVImportResult {
  importedCount: number;
  skippedCount: number;
  createdCategories: string[];
  errors: string[];
}
