import { paperworkItems } from "@/data/mock/paperwork-items";
import { projects } from "@/data/mock/projects";
import { API_URL, apiFetch, apiFetchSafe } from "@/lib/http";

import type { PaperworkItem, Project } from "./types";

export async function listProjects(): Promise<Project[]> {
  return API_URL ? apiFetchSafe<Project[]>("/projects", []) : projects;
}

export async function getProject(id: number): Promise<Project | undefined> {
  if (API_URL) {
    return apiFetch<Project>(`/projects/${id}`).catch(() => undefined);
  }
  return projects.find((p) => p.id === id);
}

export async function listPaperworkItems(
  projectId: number
): Promise<PaperworkItem[]> {
  if (API_URL) {
    return apiFetchSafe<PaperworkItem[]>(
      `/paperwork-items?project_id=${projectId}`,
      []
    );
  }
  return paperworkItems.filter((i) => i.project_id === projectId);
}
