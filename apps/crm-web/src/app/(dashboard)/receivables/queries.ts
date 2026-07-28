import { bills } from "@/data/mock/bills";
import { paymentMilestones } from "@/data/mock/payment-milestones";
import { settlements } from "@/data/mock/settlements";
import { API_URL, apiFetchSafe } from "@/utils/http/http";

import type { BillStatus, MilestoneStatus } from "./enums";
import type { Bill, PaymentMilestone, Settlement } from "./types";

// Cross-entity list reads. Both endpoints page at DEFAULT_PAGE_SIZE=100 /
// MAX_PAGE_SIZE=500 (F17), so `status` and `limit` exist to make the request
// match what the caller actually renders instead of paging blind.
const listQuery = ({ status, limit }: { status?: string; limit?: number }) => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (limit) params.set("limit", String(limit));
  const query = params.toString();
  return query ? `?${query}` : "";
};

export async function listPaymentMilestones({
  status,
  limit,
}: { status?: MilestoneStatus; limit?: number } = {}): Promise<
  PaymentMilestone[]
> {
  if (API_URL) {
    return apiFetchSafe<PaymentMilestone[]>(
      `/payment-milestones${listQuery({ status, limit })}`,
      []
    );
  }
  const rows = status
    ? paymentMilestones.filter((m) => m?.status === status)
    : paymentMilestones;
  return limit ? rows.slice(0, limit) : rows;
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

export async function listBills({
  status,
  limit,
}: { status?: BillStatus; limit?: number } = {}): Promise<Bill[]> {
  if (API_URL) {
    return apiFetchSafe<Bill[]>(`/bills${listQuery({ status, limit })}`, []);
  }
  const rows = status ? bills.filter((b) => b?.status === status) : bills;
  return limit ? rows.slice(0, limit) : rows;
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
