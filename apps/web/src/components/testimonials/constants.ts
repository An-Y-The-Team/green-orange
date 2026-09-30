import { CategoryFilter } from "@/constants/category";

import { TestimonialFilterTab } from "./types";

// Category filter tabs shown above the testimonial cards.
export const TESTIMONIAL_FILTER_TABS: TestimonialFilterTab[] = [
  { id: CategoryFilter.ALL, label: "Tất cả" },
  { id: CategoryFilter.CLEANING, label: "Về vệ sinh" },
  { id: CategoryFilter.CONSTRUCTION, label: "Về thi công" },
];
