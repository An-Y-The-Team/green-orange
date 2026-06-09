import { SectionId } from "@/constants/section";

import { NavItem } from "./types";

// Primary navigation links rendered in the desktop nav and mobile drawer.
export const NAV_ITEMS: NavItem[] = [
  { label: "Giới Thiệu", id: SectionId.INTRODUCTION },
  { label: "Dịch Vụ", id: SectionId.SERVICES },
  { label: "Dự Án Đã Làm", id: SectionId.PROJECTS },
  { label: "Đánh Giá", id: SectionId.TESTIMONIALS },
  { label: "Liên Hệ", id: SectionId.CONTACT },
];

// Sections tracked by the scroll spy to highlight the active nav item.
export const SCROLL_SPY_SECTIONS: SectionId[] = [
  SectionId.INTRODUCTION,
  SectionId.SERVICES,
  SectionId.PROJECTS,
  SectionId.TESTIMONIALS,
  SectionId.CONTACT,
];
