import { CategoryFilter } from "@/constants/category";

import { TestimonialFilterTab } from "./types";

// Category filter tabs shown above the testimonial cards.
export const TESTIMONIAL_FILTER_TABS: TestimonialFilterTab[] = [
  { id: CategoryFilter.ALL, label: "Tất cả đánh giá" },
  { id: CategoryFilter.CLEANING, label: "Về chất lượng Vệ Sinh" },
  { id: CategoryFilter.CONSTRUCTION, label: "Về tay nghề Thi Công" },
];
