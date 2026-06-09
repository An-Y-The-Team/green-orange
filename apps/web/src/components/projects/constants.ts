import { CategoryFilter } from "@/constants/category";

import { ProjectFilterTab } from "./types";

// Category filter tabs shown above the projects grid.
export const PROJECT_FILTER_TABS: ProjectFilterTab[] = [
  { id: CategoryFilter.ALL, label: "Tất cả công trình" },
  { id: CategoryFilter.CLEANING, label: "Chuyên môn Vệ Sinh" },
  { id: CategoryFilter.CONSTRUCTION, label: "Mảng Thi Công" },
];
