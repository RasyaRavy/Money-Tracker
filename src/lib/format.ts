import { format, parseISO, isValid } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatIDR(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
  return idrFormatter.format(safeAmount);
}

export function formatSignedIDR(
  amount: number,
  signType: "income" | "expense" | "net"
): string {
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
  if (safeAmount === 0) {
    return idrFormatter.format(0);
  }
  const absFormatted = idrFormatter.format(Math.abs(safeAmount));
  if (signType === "income") {
    return `+${absFormatted}`;
  }
  if (signType === "expense") {
    return `-${absFormatted}`;
  }
  return safeAmount > 0 ? `+${absFormatted}` : `-${absFormatted}`;
}

export function formatCompactIDR(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp ${(abs / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${Math.round(abs / 1_000)} rb`;
  }
  return formatIDR(amount);
}

export function formatThousandInput(value: number | string): string {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  const numeric = parseInt(digits, 10);
  if (!Number.isFinite(numeric) || numeric === 0) return "";
  return numberFormatter.format(numeric);
}

export function parseThousandInput(formatted: string): number {
  const digits = formatted.replace(/\D/g, "");
  if (!digits) return 0;
  const numeric = parseInt(digits, 10);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function formatDateLong(dateStr: string): string {
  const parsed = parseISO(dateStr);
  if (!isValid(parsed)) return dateStr;
  return format(parsed, "EEEE, d MMMM yyyy", { locale: idLocale });
}

export function formatDateShort(dateStr: string): string {
  const parsed = parseISO(dateStr);
  if (!isValid(parsed)) return dateStr;
  return format(parsed, "d MMM yyyy", { locale: idLocale });
}

export function formatMonthLabel(monthStr: string): string {
  const parsed = parseISO(`${monthStr}-01`);
  if (!isValid(parsed)) return monthStr;
  return format(parsed, "MMMM yyyy", { locale: idLocale });
}

export function getTodayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function getCurrentMonthISO(): string {
  return format(new Date(), "yyyy-MM");
}
