import {
  MilestoneStatus,
  MilestoneType,
} from "@/app/(dashboard)/receivables/enums";
import type { PaymentMilestone } from "@/app/(dashboard)/receivables/types";

// Đợt thanh toán — v2. Project 2 (đang thi công): deposit collected at stage 4
// (bill_id null — pre-bill) plus a progress đợt past its due date and unpaid,
// so the list page can demo the DERIVED "Quá hạn" display. Project 3 (đã đóng):
// deposit + progress both attached to bill 1 and paid.
export const paymentMilestones: PaymentMilestone[] = [
  // CT-2026-002 — đang thi công
  {
    id: 1,
    project_id: 2,
    bill_id: null,
    type: MilestoneType.DEPOSIT,
    amount: 15_000_000,
    due_date: "2026-07-05",
    status: MilestoneStatus.PAID,
    paid_date: "2026-07-04",
  },
  {
    id: 2,
    project_id: 2,
    bill_id: null,
    type: MilestoneType.PROGRESS,
    amount: 20_000_000,
    due_date: "2026-07-15", // past due, unpaid → derived Quá hạn
    status: MilestoneStatus.AWAITING_PAYMENT,
    paid_date: null,
  },

  // CT-2026-003 — đã đóng, fully collected via bill 1
  {
    id: 3,
    project_id: 3,
    bill_id: 1,
    type: MilestoneType.DEPOSIT,
    amount: 10_000_000,
    due_date: "2026-05-30",
    status: MilestoneStatus.PAID,
    paid_date: "2026-05-29",
  },
  {
    id: 4,
    project_id: 3,
    bill_id: 1,
    type: MilestoneType.PROGRESS,
    amount: 24_050_000, // settlement total − deposit
    due_date: "2026-06-30",
    status: MilestoneStatus.PAID,
    paid_date: "2026-06-28",
  },
];
