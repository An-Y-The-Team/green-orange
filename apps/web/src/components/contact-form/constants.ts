import { ClipboardCheck, Sparkle, Wrench } from "lucide-react";

import { Category } from "@/constants/category";

import { ServiceCategoryOption } from "./types";

// localStorage key used to persist contact submissions on the device.
export const SUBMISSIONS_STORAGE_KEY = "greenorange_submissions";

// How long the success banner stays visible after a submission (ms).
export const SUCCESS_BANNER_DURATION_MS = 6000;

// URL search params the form reads to pre-fill the category, service, and message.
export const SEARCH_PARAM = {
  CATEGORY: "category",
  SERVICE_ID: "serviceId",
  QUOTE_PROJECT: "quoteProject",
} as const;

// Service-group toggle buttons rendered in the contact form.
export const SERVICE_CATEGORY_OPTIONS: ServiceCategoryOption[] = [
  {
    id: Category.CLEANING,
    label: "Vệ Sinh",
    icon: Sparkle,
    color: "text-brand-primary-600",
  },
  {
    id: Category.CONSTRUCTION,
    label: "Thi Công",
    icon: Wrench,
    color: "text-brand-secondary-500",
  },
  {
    id: Category.BOTH,
    label: "Trọn Gói Cả Hai",
    icon: ClipboardCheck,
    color: "text-slate-700",
  },
];
