import { BillStatus } from "@/app/(dashboard)/receivables/enums";
import type { Bill } from "@/app/(dashboard)/receivables/types";

// Hóa đơn — v2. Bills are born with their settlement (no standalone create).
// Bill 1 belongs to settlement 1 (project 3, đã đóng) and is fully paid.
export const bills: Bill[] = [
  {
    id: 1,
    project_id: 3,
    settlement_id: 1,
    status: BillStatus.PAID,
    total_amount: 34_050_000,
    sent_date: "2026-06-21",
    paid_date: "2026-06-28",
  },
];
