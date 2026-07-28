import { bills } from "@/data/mock/bills";
import { paymentMilestones } from "@/data/mock/payment-milestones";
import { projects } from "@/data/mock/projects";
import { settlements } from "@/data/mock/settlements";
import { API_URL, apiFetch } from "@/utils/http/http";

import type { BillStatus, MilestoneStatus } from "./enums";
import type { Bill, PaymentMilestone, ProjectRef, Settlement } from "./types";

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

// Mock-mode counterpart of the backend's narrow `project` include, which exists
// on the two cross-project lists only — so mock rows carry the same fields.
const projectRef = (projectId: number): ProjectRef | undefined => {
  const project = projects.find((p) => p?.id === projectId);
  return project && { id: project.id, code: project.code };
};

const withProject = <T extends { project_id: number }>(rows: T[]): T[] =>
  rows.map((row) => ({ ...row, project: projectRef(row.project_id) }));

export async function listPaymentMilestones({
  status,
  limit,
}: { status?: MilestoneStatus; limit?: number } = {}): Promise<
  PaymentMilestone[]
> {
  if (API_URL) {
    return apiFetch<PaymentMilestone[]>(
      `/payment-milestones${listQuery({ status, limit })}`
    );
  }
  const rows = status
    ? paymentMilestones.filter((m) => m?.status === status)
    : paymentMilestones;
  return withProject(limit ? rows.slice(0, limit) : rows);
}

/** All payment milestones for a project (mirrors GET /payment-milestones?project_id=). */
export async function getProjectMilestones(
  projectId: number
): Promise<PaymentMilestone[]> {
  return API_URL
    ? apiFetch<PaymentMilestone[]>(
        `/payment-milestones?project_id=${projectId}`
      )
    : paymentMilestones.filter((m) => m.project_id === projectId);
}

export async function listBills({
  status,
  limit,
}: { status?: BillStatus; limit?: number } = {}): Promise<Bill[]> {
  if (API_URL) {
    return apiFetch<Bill[]>(`/bills${listQuery({ status, limit })}`);
  }
  const rows = status ? bills.filter((b) => b?.status === status) : bills;
  return withProject(limit ? rows.slice(0, limit) : rows);
}

/** All bills for a project (mirrors GET /bills?project_id=; includes milestones). */
export async function getProjectBills(projectId: number): Promise<Bill[]> {
  return API_URL
    ? apiFetch<Bill[]>(`/bills?project_id=${projectId}`)
    : bills.filter((b) => b.project_id === projectId);
}

export async function listSettlements(): Promise<Settlement[]> {
  return API_URL ? apiFetch<Settlement[]>("/settlements") : settlements;
}

/** All settlements for a project (mirrors GET /settlements?project_id=; each includes bill + items). */
export async function getProjectSettlements(
  projectId: number
): Promise<Settlement[]> {
  return API_URL
    ? apiFetch<Settlement[]>(`/settlements?project_id=${projectId}`)
    : settlements.filter((s) => s.project_id === projectId);
}
