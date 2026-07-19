import {
  FileSignature,
  FileText,
  HardHat,
  LayoutDashboard,
  type LucideIcon,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// Domain-focused nav for the cleaning & construction CRM. The old generic
// pages (contacts/leads/deals/tasks) remain on disk for reference but are no
// longer linked here. Công trình is the hub; Báo giá / Hợp đồng / Thu-Nợ are
// cross-project views.
export const navItems: NavItem[] = [
  { label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { label: "Khách hàng", href: "/clients", icon: Users },
  { label: "Công trình", href: "/projects", icon: HardHat },
  { label: "Nhân sự", href: "/crew", icon: UsersRound },
  { label: "Báo giá", href: "/quotes", icon: FileText },
  { label: "Hợp đồng", href: "/contracts", icon: FileSignature },
  { label: "Thu / Nợ", href: "/receivables", icon: Wallet },
];
