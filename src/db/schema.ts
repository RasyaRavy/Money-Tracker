import {
  pgTable,
  text,
  bigint,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    image: text("image"),
    passwordHash: text("password_hash"),
    provider: text("provider").notNull().default("credentials"), // "google" | "credentials"
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)]
);

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(), // "income" | "expense"
    icon: text("icon").notNull(),
    color: text("color").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("categories_user_type_idx").on(table.userId, table.type),
  ]
);

export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    type: text("type").notNull(), // "income" | "expense"
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    date: text("date").notNull(), // YYYY-MM-DD
    note: text("note").notNull().default(""),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("transactions_user_date_idx").on(table.userId, table.date),
    index("transactions_user_type_idx").on(table.userId, table.type),
    index("transactions_user_cat_idx").on(table.userId, table.categoryId),
  ]
);

export const budgets = pgTable(
  "budgets",
  {
    id: text("id").primaryKey(), // `${userId}_${month}_${categoryId}`
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    month: text("month").notNull(), // YYYY-MM
    categoryId: text("category_id").notNull(), // "TOTAL" or Category["id"]
    amount: bigint("amount", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("budgets_user_month_idx").on(table.userId, table.month),
    uniqueIndex("budgets_user_month_cat_unique").on(
      table.userId,
      table.month,
      table.categoryId
    ),
  ]
);
