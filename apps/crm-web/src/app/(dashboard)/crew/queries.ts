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
