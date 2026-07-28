// Thu & công nợ — v2 contract shapes, mirrored from crm-api-nest
// src/receivables/receivables.module.ts. Chain: Settlement (Quyết toán) →
// Bill (Hóa đơn) → PaymentMilestone (Đợt thanh toán).
// snake_case; *_date = 'YYYY-MM-DD'; money arrives as numbers (VND).
import type {
  BillStatus,
  MilestoneStatus,
  MilestoneType,
  SettlementStatus,
} from "./enums";

// Narrow project relation, exactly as crm-api-nest includes it on the
// cross-project lists (GET /bills, GET /payment-milestones) so those tables can
// print a code instead of `#id` (F40). Optional: the per-project reads
// (?project_id=) don't carry it — the caller already knows the project.
export interface ProjectRef {
  id: number;
  code: string;
}

export interface SettlementItem {
  id: number;
  settlement_id: number;
  description: string;
  unit?: string | null; // m², buổi, … (free text)
  quantity: number;
  unit_price: number;
  amount: number; // server-computed = round(quantity × unit_price)
  sort_order: number;
}

export interface Settlement {
  id: number;
  project_id: number;
  status: SettlementStatus;
  total_amount: number; // server-computed Σ item amounts
  signed_date?: string | null;
  note?: string | null;
  items: SettlementItem[]; // include, ordered by sort_order
  bill?: Bill | null; // include — born (and dies) with the settlement
}

export interface Bill {
  id: number;
  project_id: number;
  settlement_id?: number | null;
  status: BillStatus;
  total_amount: number; // gets the settlement total on sign
  sent_date?: string | null;
  paid_date?: string | null;
  milestones?: PaymentMilestone[]; // include on GET /bills
  project?: ProjectRef; // include on the LIST path only — see ProjectRef
}

export interface PaymentMilestone {
  id: number;
  project_id: number;
  bill_id?: number | null; // null for the stage-4 deposit (pre-bill)
  type: MilestoneType;
  amount: number;
  due_date?: string | null;
  status: MilestoneStatus; // overdue is DERIVED (isOverdue), never stored
  paid_date?: string | null;
  project?: ProjectRef; // include on the LIST path only — see ProjectRef
}
