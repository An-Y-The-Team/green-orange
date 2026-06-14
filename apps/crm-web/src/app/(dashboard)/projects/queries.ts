import { acceptances } from "@/data/mock/acceptances";
import { costs } from "@/data/mock/costs";
import { projects } from "@/data/mock/projects";
import { API_URL, apiFetch, apiFetchSafe } from "@/lib/http";
import type { Acceptance, Cost, Project } from "@/types";

export async function listProjects(): Promise<Project[]> {
  return API_URL ? apiFetchSafe<Project[]>("/projects", []) : projects;
}

export async function getProject(id: number): Promise<Project | undefined> {
  if (API_URL) {
    return apiFetch<Project>(`/projects/${id}`).catch(() => undefined);
  }
  return projects.find((p) => p.id === id);
}

// Project sub-resources (logged on-site), joined to a project by project_code.
export async function listCosts(): Promise<Cost[]> {
  return API_URL ? apiFetchSafe<Cost[]>("/costs", []) : costs;
}

export async function listAcceptances(): Promise<Acceptance[]> {
  return API_URL ? apiFetchSafe<Acceptance[]>("/acceptances", []) : acceptances;
}
