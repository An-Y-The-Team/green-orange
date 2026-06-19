// Thanh toán theo đợt — milestone payment schedule / công nợ (steps 14-15).
import type { MilestoneStatus, MilestoneType } from "./enums";

export interface PaymentMilestone {
  id: number;
  contract_code: string;
  project_code: string;
  customer: string;
  name: string;
  type: MilestoneType;
  status: MilestoneStatus;
  due_amount: number;
  paid_amount: number;
  due_date: string;
  gated_by_acceptance: boolean; // cannot collect until nghiệm thu is done
}
