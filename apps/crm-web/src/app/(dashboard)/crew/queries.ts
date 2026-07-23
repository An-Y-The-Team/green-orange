import { assignments } from "@/data/mock/assignments";
import { crew } from "@/data/mock/crew";
import { crewRoles } from "@/data/mock/crew-roles";
import { timekeeping } from "@/data/mock/timekeeping";
import { API_URL, apiFetch, apiFetchSafe } from "@/lib/http";

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

export async function listCrew(): Promise<CrewMember[]> {
  return API_URL ? apiFetchSafe<CrewMember[]>("/crew", []) : crew;
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

export async function listTimekeeping(
  crewMemberId: number
): Promise<TimekeepingRecord[]> {
  return API_URL
    ? apiFetchSafe<TimekeepingRecord[]>(
        `/timekeeping?crew_member_id=${crewMemberId}`,
        []
      )
    : timekeeping.filter((t) => t.crew_member_id === crewMemberId);
}

/** GET /assignments?project_id= — crew_member + role includes (stage-6 panel). */
export async function getProjectAssignments(
  projectId: number
): Promise<Assignment[]> {
  return API_URL
    ? apiFetchSafe<Assignment[]>(`/assignments?project_id=${projectId}`, [])
    : assignments.filter((a) => a.project_id === projectId);
}

/** GET /timekeeping?project_id= — no crew_member include (stage-6 panel). */
export async function getProjectTimekeeping(
  projectId: number
): Promise<TimekeepingRecord[]> {
  return API_URL
    ? apiFetchSafe<TimekeepingRecord[]>(
        `/timekeeping?project_id=${projectId}`,
        []
      )
    : timekeeping.filter((t) => t.project_id === projectId);
}
