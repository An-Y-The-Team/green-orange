import { SectionId } from "@/constants/section";

import { QuickLink } from "./types";

// Anchor links listed in the footer's "Đường Dẫn Nhanh" column.
export const QUICK_LINKS: QuickLink[] = [
  { label: "Về chúng tôi", id: SectionId.INTRODUCTION },
  { label: "Giải pháp dịch vụ", id: SectionId.SERVICES },
  { label: "Dự án tiêu biểu", id: SectionId.PROJECTS },
  { label: "Phản hồi khách hàng", id: SectionId.TESTIMONIALS },
  { label: "Yêu cầu khảo sát", id: SectionId.CONTACT },
];
