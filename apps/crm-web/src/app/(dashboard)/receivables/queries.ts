import { bills } from "@/data/mock/bills";
import { paymentMilestones } from "@/data/mock/payment-milestones";
import { settlements } from "@/data/mock/settlements";
import { API_URL, apiFetchSafe } from "@/lib/http";

import type { Bill, PaymentMilestone, Settlement } from "./types";

export async function listPaymentMilestones(): Promise<PaymentMilestone[]> {
  return API_URL
    ? apiFetchSafe<PaymentMilestone[]>("/payment-milestones", [])
    : paymentMilestones;
}

/** All payment milestones for a project (mirrors GET /payment-milestones?project_id=). */
export async function getProjectMilestones(
  projectId: number
): Promise<PaymentMilestone[]> {
  return API_URL
    ? apiFetchSafe<PaymentMilestone[]>(
        `/payment-milestones?project_id=${projectId}`,
        []
      )
    : paymentMilestones.filter((m) => m.project_id === projectId);
}

export async function listBills(): Promise<Bill[]> {
  return API_URL ? apiFetchSafe<Bill[]>("/bills", []) : bills;
}

/** All bills for a project (mirrors GET /bills?project_id=; includes milestones). */
export async function getProjectBills(projectId: number): Promise<Bill[]> {
  return API_URL
    ? apiFetchSafe<Bill[]>(`/bills?project_id=${projectId}`, [])
    : bills.filter((b) => b.project_id === projectId);
}

export async function listSettlements(): Promise<Settlement[]> {
  return API_URL ? apiFetchSafe<Settlement[]>("/settlements", []) : settlements;
}

/** All settlements for a project (mirrors GET /settlements?project_id=; each includes bill + items). */
export async function getProjectSettlements(
  projectId: number
): Promise<Settlement[]> {
  return API_URL
    ? apiFetchSafe<Settlement[]>(`/settlements?project_id=${projectId}`, [])
    : settlements.filter((s) => s.project_id === projectId);
}
