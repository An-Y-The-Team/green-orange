import {
  FileSignature,
  FileText,
  HardHat,
  LayoutDashboard,
  type LucideIcon,
  Tags,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// v2 nav (docs/features/crm-ui-redesign.md IA). Công trình is the hub;
// Báo giá / Hợp đồng / Thu & công nợ are cross-project views.
export const navItems: NavItem[] = [
  { label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { label: "Công trình", href: "/projects", icon: HardHat },
  { label: "Khách hàng", href: "/clients", icon: Users },
  { label: "Báo giá", href: "/quotes", icon: FileText },
  { label: "Hợp đồng", href: "/contracts", icon: FileSignature },
  { label: "Thu & công nợ", href: "/receivables", icon: Wallet },
  { label: "Nhân sự", href: "/crew", icon: UsersRound },
  { label: "Danh mục", href: "/settings", icon: Tags },
];
