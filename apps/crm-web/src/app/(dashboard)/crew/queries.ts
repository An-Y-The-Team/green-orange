import { MAX_PAGE_SIZE } from "@/constants/pagination";
import { assignments } from "@/data/mock/assignments";
import { crew } from "@/data/mock/crew";
import { crewRoles } from "@/data/mock/crew-roles";
import { timekeeping } from "@/data/mock/timekeeping";
import type { DateRange } from "@/utils/date-range/date-range";
import { API_URL, apiFetch, apiFetchSafe } from "@/utils/http/http";
import { pageQuery } from "@/utils/page-param/page-param";

import type {
  Assignment,
  CrewMember,
  CrewRole,
  TimekeepingRecord,
} from "./types";

// Reads degrade to [] / undefined when the backend is unreachable, same as
// the other features — pages render empty instead of 500-ing.

export async function listCrewRoles(): Promise<CrewRole[]> {
  return API_URL ? apiFetchSafe<CrewRole[]>("/crew-roles", []) : crewRoles;
}

// GET /crew pages at DEFAULT_PAGE_SIZE=100 / MAX_PAGE_SIZE=500 (F17) — a window,
// never the whole roster, so callers using it as a lookup pass an explicit limit.
export async function listCrew({
  limit,
  offset,
}: { limit?: number; offset?: number } = {}): Promise<CrewMember[]> {
  if (API_URL) {
    return apiFetchSafe<CrewMember[]>(
      `/crew${pageQuery({ limit, offset })}`,
      []
    );
  }
  const start = offset ?? 0;
  return crew.slice(start, limit ? start + limit : undefined);
}

/** GET /crew/:id — includes default_role + assignments (with project ref). */
export async function getCrewMember(
  id: number
): Promise<CrewMember | undefined> {
  if (API_URL) {
    return apiFetch<CrewMember>(`/crew/${id}`).catch(() => undefined);
  }
  const member = crew.find((c) => c.id === id);
  if (!member) return undefined;
  return {
    ...member,
    assignments: assignments.filter((a) => a.crew_member_id === id),
  };
}

export async function listAssignments(): Promise<Assignment[]> {
  return API_URL ? apiFetchSafe<Assignment[]>("/assignments", []) : assignments;
}

// Chấm công is the fastest-growing table (one row per member per work day per
// source), so GET /timekeeping answers a dateless call with the last 31 days and
// a single 100-row page. Both reads below therefore state the window they render
// and ask for the largest page the API serves — one week of a 15-member công
// trình already passes the 100-row default.
const rangeQuery = ({ from, to }: DateRange) =>
  `from=${from}&to=${to}&limit=${MAX_PAGE_SIZE}`;

// Mock mode applies the same window as the live query — otherwise local dev
// shows rows production would have filtered out and hides the truncation.
const inRange = (record: TimekeepingRecord, { from, to }: DateRange) =>
  record.work_date >= from && record.work_date <= to;

/** GET /timekeeping?crew_member_id= — one member, within an explicit window. */
export async function listTimekeeping({
  crewMemberId,
  range,
}: {
  crewMemberId: number;
  range: DateRange;
}): Promise<TimekeepingRecord[]> {
  return API_URL
    ? apiFetchSafe<TimekeepingRecord[]>(
        `/timekeeping?crew_member_id=${crewMemberId}&${rangeQuery(range)}`,
        []
      )
    : timekeeping.filter(
        (t) => t.crew_member_id === crewMemberId && inRange(t, range)
      );
}

/** GET /assignments?project_id= — crew_member + role includes (stage-6 panel). */
export async function getProjectAssignments(
  projectId: number
): Promise<Assignment[]> {
  return API_URL
    ? apiFetchSafe<Assignment[]>(`/assignments?project_id=${projectId}`, [])
    : assignments.filter((a) => a.project_id === projectId);
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
  return API_URL
    ? apiFetchSafe<TimekeepingRecord[]>(
        `/timekeeping?project_id=${projectId}&${rangeQuery(range)}`,
        []
      )
    : timekeeping.filter(
        (t) => t.project_id === projectId && inRange(t, range)
      );
}
