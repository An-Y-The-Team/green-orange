import {
  Building2,
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

import { FIELDS } from "@/constants/labels";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// v2 nav (docs/features/crm-ui-redesign.md IA). Công trình is the hub;
// Báo giá / Hợp đồng / Thu & công nợ are cross-project views.
export const NAV_ITEMS: NavItem[] = [
  { label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { label: FIELDS.project, href: "/projects", icon: HardHat },
  { label: FIELDS.client, href: "/clients", icon: Users },
  { label: "Báo giá", href: "/quotes", icon: FileText },
  { label: "Hợp đồng", href: "/contracts", icon: FileSignature },
  { label: "Thu & công nợ", href: "/receivables", icon: Wallet },
  { label: FIELDS.crew, href: "/crew", icon: UsersRound },
  // Company profile is its own destination: nobody looks for the letterhead
  // under "Danh mục".
  { label: "Thông tin công ty", href: "/settings/company", icon: Building2 },
  { label: "Danh mục", href: "/settings", icon: Tags },
];
