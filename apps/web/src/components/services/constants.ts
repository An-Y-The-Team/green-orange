import {
  CalendarClock,
  LayoutTemplate,
  Lightbulb,
  LucideIcon,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

import { CategoryFilter } from "@/constants/category";

import { ServiceFilterTab } from "./types";

// Maps a service's `iconName` (from data) to its lucide icon component.
export const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  CalendarClock,
  ShieldCheck,
  Wrench,
  Lightbulb,
  LayoutTemplate,
};

// Icon rendered when a service's `iconName` has no entry in ICON_MAP.
export const FALLBACK_SERVICE_ICON: LucideIcon = Sparkles;

// Category filter buttons shown above the services grid.
export const SERVICE_FILTER_TABS: ServiceFilterTab[] = [
  { id: CategoryFilter.ALL, label: "Tất cả dịch vụ" },
  { id: CategoryFilter.CLEANING, label: "Vệ Sinh Chuyên Sâu" },
  { id: CategoryFilter.CONSTRUCTION, label: "Thi Công & Cải Tạo" },
];
