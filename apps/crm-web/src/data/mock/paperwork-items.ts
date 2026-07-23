import { PaperworkStatus } from "@/app/(dashboard)/projects/enums";
import type { PaperworkItem } from "@/app/(dashboard)/projects/types";

// Stage-5 checklist for CT-2026-002 — the 4 auto-seeded defaults. "PCCC" is
// submitted with a past due_date to demo the derived overdue badge.
export const paperworkItems: PaperworkItem[] = [
  {
    id: 1,
    project_id: 2,
    name: "Giấy phép thi công",
    status: PaperworkStatus.APPROVED,
    due_date: "2026-06-25",
  },
  {
    id: 2,
    project_id: 2,
    name: "PCCC",
    status: PaperworkStatus.SUBMITTED,
    due_date: "2026-06-28",
    note: "Chờ ban quản lý tòa nhà duyệt",
  },
  {
    id: 3,
    project_id: 2,
    name: "Danh sách nhân sự",
    status: PaperworkStatus.APPROVED,
  },
  {
    id: 4,
    project_id: 2,
    name: "Danh sách thiết bị",
    status: PaperworkStatus.APPROVED,
  },
];
