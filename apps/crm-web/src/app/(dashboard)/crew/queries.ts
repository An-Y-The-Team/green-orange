import { assignments } from "@/data/mock/assignments";
import { crew } from "@/data/mock/crew";
import { API_URL, apiFetch, apiFetchSafe } from "@/lib/http";
import type { Assignment, CrewMember } from "@/types";

// Degrades to [] if the backend is unreachable/erroring — same as the other
// list queries, so the page renders empty rather than 500-ing.
export async function listCrew(): Promise<CrewMember[]> {
  return API_URL ? apiFetchSafe<CrewMember[]>("/crew", []) : crew;
}

export async function getCrewMember(
  id: number
): Promise<CrewMember | undefined> {
  if (API_URL) {
    return apiFetch<CrewMember>(`/crew/${id}`).catch(() => undefined);
  }
  return crew.find((c) => c.id === id);
}

// Phân công — joined to a project by project_code, like the other sub-resources.
export async function listAssignments(): Promise<Assignment[]> {
  return API_URL ? apiFetchSafe<Assignment[]>("/assignments", []) : assignments;
}
