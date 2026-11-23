import React from "react";
import {
  Wallet,
  Briefcase,
  TrendingUp,
  Gift,
  Coins,
  Utensils,
  Car,
  Zap,
  ShoppingBag,
  Film,
  HeartPulse,
  GraduationCap,
  Home,
  Smartphone,
  Coffee,
  Plane,
  Wrench,
  CircleEllipsis,
  type LucideProps,
} from "lucide-react";
import type { CategoryIconName } from "@/lib/types";

export const CATEGORY_ICON_OPTIONS: { name: CategoryIconName; label: string }[] = [
  { name: "Wallet", label: "Dompet / Gaji" },
  { name: "Briefcase", label: "Kantor / Usaha" },
  { name: "TrendingUp", label: "Investasi" },
  { name: "Gift", label: "Bonus / Hadiah" },
  { name: "Coins", label: "Koin / Tunai" },
  { name: "Utensils", label: "Makanan" },
  { name: "Coffee", label: "Kopi / Jajan" },
  { name: "Car", label: "Transportasi" },
  { name: "Zap", label: "Listrik / Tagihan" },
  { name: "ShoppingBag", label: "Belanja" },
  { name: "Home", label: "Tempat Tinggal" },
  { name: "HeartPulse", label: "Kesehatan" },
  { name: "Film", label: "Hiburan" },
  { name: "GraduationCap", label: "Pendidikan" },
  { name: "Smartphone", label: "Pulsa / Internet" },
  { name: "Plane", label: "Perjalanan" },
  { name: "Wrench", label: "Servis / Perbaikan" },
  { name: "CircleEllipsis", label: "Lainnya" },
];

export const CATEGORY_COLOR_OPTIONS: { hex: string; label: string }[] = [
  { hex: "#059669", label: "Hijau Emerald" },
  { hex: "#0d9488", label: "Hijau Teal" },
  { hex: "#2563eb", label: "Biru Royal" },
  { hex: "#0284c7", label: "Biru Langit" },
  { hex: "#4f46e5", label: "Indigo" },
  { hex: "#7c3aed", label: "Ungu Violet" },
  { hex: "#9333ea", label: "Ungu" },
  { hex: "#db2777", label: "Merah Muda" },
  { hex: "#e11d48", label: "Merah Rose" },
  { hex: "#dc2626", label: "Merah Terang" },
  { hex: "#d97706", label: "Kuning Amber" },
  { hex: "#475569", label: "Abu Slate" },
];

const ICON_COMPONENTS: Record<CategoryIconName, React.ComponentType<LucideProps>> = {
  Wallet,
  Briefcase,
  TrendingUp,
  Gift,
  Coins,
  Utensils,
  Car,
  Zap,
  ShoppingBag,
  Film,
  HeartPulse,
  GraduationCap,
  Home,
  Smartphone,
  Coffee,
  Plane,
  Wrench,
  CircleEllipsis,
};

interface CategoryIconProps extends LucideProps {
  name: CategoryIconName | string;
}

export function CategoryIcon({ name, ...props }: CategoryIconProps) {
  const IconComponent =
    ICON_COMPONENTS[name as CategoryIconName] ?? CircleEllipsis;
  return <IconComponent aria-hidden="true" {...props} />;
}
