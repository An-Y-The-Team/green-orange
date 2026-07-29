import { apiFetch } from "@/utils/http/http";

import type { BillStatus, MilestoneStatus } from "./enums";
import type { Bill, PaymentMilestone, Settlement } from "./types";

// Money reads use apiFetch, not apiFetchSafe: a timed-out GET /settlements
// degraded to `[]` reads as "chưa có quyết toán" on the very screens that decide
// whether a job is settled and collected (F28). Let it reach the route's
// error boundary instead.

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
  return apiFetch<PaymentMilestone[]>(
    `/payment-milestones${listQuery({ status, limit })}`
  );
}

/** All payment milestones for a project (mirrors GET /payment-milestones?project_id=). */
export async function getProjectMilestones(
  projectId: number
): Promise<PaymentMilestone[]> {
  return apiFetch<PaymentMilestone[]>(
    `/payment-milestones?project_id=${projectId}`
  );
}

export async function listBills({
  status,
  limit,
}: { status?: BillStatus; limit?: number } = {}): Promise<Bill[]> {
  return apiFetch<Bill[]>(`/bills${listQuery({ status, limit })}`);
}

/** All bills for a project (mirrors GET /bills?project_id=; includes milestones). */
export async function getProjectBills(projectId: number): Promise<Bill[]> {
  return apiFetch<Bill[]>(`/bills?project_id=${projectId}`);
}

export async function listSettlements(): Promise<Settlement[]> {
  return apiFetch<Settlement[]>("/settlements");
}

/** All settlements for a project (mirrors GET /settlements?project_id=; each includes bill + items). */
export async function getProjectSettlements(
  projectId: number
): Promise<Settlement[]> {
  return apiFetch<Settlement[]>(`/settlements?project_id=${projectId}`);
}
