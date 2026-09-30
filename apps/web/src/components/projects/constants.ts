import { CategoryFilter } from "@/constants/category";

import { ProjectFilterTab } from "./types";

// Category filter tabs shown above the projects grid.
export const PROJECT_FILTER_TABS: ProjectFilterTab[] = [
  { id: CategoryFilter.ALL, label: "Tất cả" },
  { id: CategoryFilter.CLEANING, label: "Vệ sinh" },
  { id: CategoryFilter.CONSTRUCTION, label: "Thi công" },
];
