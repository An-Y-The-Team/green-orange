import { MAX_PAGE_SIZE } from "@/constants/pagination";
import { addDays } from "@/utils/add-days/add-days";
import type { DateRange } from "@/utils/date-range/date-range";
import { apiFetchDetail, apiFetchList, apiFetchSafe } from "@/utils/http/http";
import { pageQuery } from "@/utils/page-param/page-param";
import { todayISO } from "@/utils/today-iso/today-iso";

import { TimekeepingStatus } from "./enums";
import type { CrewMemberStatus } from "./enums";
import type {
  Assignment,
  CrewMember,
  CrewRole,
  TimekeepingRecord,
} from "./types";

// Reads degrade to [] / undefined when the backend is unreachable, same as
// the other features — pages render empty instead of 500-ing.

export async function listCrewRoles(): Promise<CrewRole[]> {
  return apiFetchSafe<CrewRole[]>("/crew-roles", []);
}

// GET /crew pages at DEFAULT_PAGE_SIZE=100 / MAX_PAGE_SIZE=500 (F17) — a window,
// never the whole roster, so callers using it as a lookup pass an explicit limit.
export async function listCrew({
  limit,
  offset,
}: { limit?: number; offset?: number } = {}): Promise<CrewMember[]> {
  return apiFetchSafe<CrewMember[]>(`/crew${pageQuery({ limit, offset })}`, []);
}

/**
 * How many nhân sự have `status`, counted server-side — the roster page used to
 * count the members on its page, which undercounts from page 2 on. `limit=1`
 * because the API floors a smaller limit to its 100-row default and the answer is
 * the header, not the body.
 */
export async function countCrew(status: CrewMemberStatus): Promise<number> {
  const { total } = await apiFetchList<CrewMember>(
    `/crew?status=${status}&limit=1`
  );
  return total;
}

/** GET /crew/:id — includes default_role + assignments (with project ref). */
export async function getCrewMember(
  id: number
): Promise<CrewMember | undefined> {
  return apiFetchDetail<CrewMember>(`/crew/${id}`);
}

export async function listAssignments(): Promise<Assignment[]> {
  return apiFetchSafe<Assignment[]>("/assignments", []);
}

// Chấm công is the fastest-growing table (one row per member per work day per
// source), so GET /timekeeping answers a dateless call with the last 31 days and
// a single 100-row page. Both reads below therefore state the window they render
// and ask for the largest page the API serves — one week of a 15-member công
// trình already passes the 100-row default.
const rangeQuery = ({ from, to }: DateRange) =>
  `from=${from}&to=${to}&limit=${MAX_PAGE_SIZE}`;

/** GET /timekeeping?crew_member_id= — one member, within an explicit window. */
export async function listTimekeeping({
  crewMemberId,
  range,
}: {
  crewMemberId: number;
  range: DateRange;
}): Promise<TimekeepingRecord[]> {
  return apiFetchSafe<TimekeepingRecord[]>(
    `/timekeeping?crew_member_id=${crewMemberId}&${rangeQuery(range)}`,
    []
  );
}

/** GET /assignments?project_id= — crew_member + role includes (stage-6 panel). */
export async function getProjectAssignments(
  projectId: number
): Promise<Assignment[]> {
  return apiFetchSafe<Assignment[]>(`/assignments?project_id=${projectId}`, []);
}

/**
 * GET /timekeeping?project_id= — no crew_member include (stage-6 panel).
 * The caller passes the window it needs: the weekly grid its 7 days, the
 * execution panel the project's own lifetime.
 */
export async function getProjectTimekeeping({
  projectId,
  range,
}: {
  projectId: number;
  range: DateRange;
}): Promise<TimekeepingRecord[]> {
  return apiFetchSafe<TimekeepingRecord[]>(
    `/timekeeping?project_id=${projectId}&${rangeQuery(range)}`,
    []
  );
}

// Pending submissions can be older than the API's 31-day dateless default (a
// worker logs Friday, the operator opens the tab after Tết) — so this read
// states an explicitly wide window instead of relying on it.
const PENDING_WINDOW_DAYS = 365;

/** GET /timekeeping?status=pending — every mini-app submission awaiting duyệt. */
export async function getPendingTimekeeping(): Promise<TimekeepingRecord[]> {
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - PENDING_WINDOW_DAYS);
  const fromParam = from.toISOString().slice(0, 10);
  return apiFetchSafe<TimekeepingRecord[]>(
    `/timekeeping?status=${TimekeepingStatus.PENDING}&from=${fromParam}&limit=${MAX_PAGE_SIZE}`,
    []
  );
}

/**
 * GET /timekeeping?status=open — shifts clocked in and not yet out.
 *
 * Same wide window and the same reason: nothing sweeps an open shift, so one a
 * worker abandoned last month is still open and still the operator's problem.
 */
export async function getOpenShifts(): Promise<TimekeepingRecord[]> {
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - PENDING_WINDOW_DAYS);
  const fromParam = from.toISOString().slice(0, 10);
  return apiFetchSafe<TimekeepingRecord[]>(
    `/timekeeping?status=${TimekeepingStatus.OPEN}&from=${fromParam}&limit=${MAX_PAGE_SIZE}`,
    []
  );
}

/**
 * The same open shifts, narrowed to the ones that have gone stale — clocked in
 * on an earlier business day, so the worker went home without chấm công ra.
 *
 * `to` filters `work_date`, so "open, dated before today" IS the stale
 * predicate: no new endpoint, and no derived column to keep in sync. Mirrors how
 * receivables answers `overdue=true`.
 */
export async function getStaleOpenShifts(): Promise<TimekeepingRecord[]> {
  const yesterday = addDays(todayISO(), -1);
  return apiFetchSafe<TimekeepingRecord[]>(
    `/timekeeping?status=${TimekeepingStatus.OPEN}&to=${yesterday}&limit=${MAX_PAGE_SIZE}`,
    []
  );
}

/** Two numbers, not rows — what GET /timekeeping/summary answers. */
export interface TimekeepingSummary {
  project_id: number;
  total_hours: number;
  recorded_days: number;
}

/**
 * GET /timekeeping/summary?project_id= — SUM(hours) + COUNT(DISTINCT work_date)
 * for the WHOLE công trình, aggregated server-side with manual winning over
 * zalo_app per member+day (the rule the weekly grid displays).
 *
 * Deliberately window-less and limit-less, unlike the row reads above: the
 * response is two numbers however many rows the project has, so there is no page
 * to fall off and no total to undercount.
 */
export async function getProjectTimekeepingSummary(
  projectId: number
): Promise<TimekeepingSummary> {
  return apiFetchSafe<TimekeepingSummary>(
    `/timekeeping/summary?project_id=${projectId}`,
    { project_id: projectId, total_hours: 0, recorded_days: 0 }
  );
}
