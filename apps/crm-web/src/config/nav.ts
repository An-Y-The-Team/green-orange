import {
  Briefcase,
  CheckSquare,
  Contact,
  LayoutDashboard,
  type LucideIcon,
  Target,
  Users,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { label: "Khách hàng", href: "/customers", icon: Users },
  { label: "Liên hệ", href: "/contacts", icon: Contact },
  { label: "Tiềm năng", href: "/leads", icon: Target },
  { label: "Cơ hội", href: "/deals", icon: Briefcase },
  { label: "Công việc", href: "/tasks", icon: CheckSquare },
];
