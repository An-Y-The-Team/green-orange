import { LucideIcon } from "lucide-react";

import { Category } from "@/constants/category";

export interface ServiceCategoryOption {
  id: Category;
  label: string;
  icon: LucideIcon;
  color: string;
}
