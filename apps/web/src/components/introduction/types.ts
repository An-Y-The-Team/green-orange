import { LucideIcon } from "lucide-react";

export interface BrandTriColors {
  left: string;
  right: string;
  bottom: string;
}

export interface BrandValue {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  triColors: BrandTriColors;
}

export interface ProcessStep {
  num: string;
  title: string;
  desc: string;
}
