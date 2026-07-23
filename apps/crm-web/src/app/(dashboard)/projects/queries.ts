import { attachments } from "@/data/mock/attachments";
import { paperworkItems } from "@/data/mock/paperwork-items";
import { projectTypes } from "@/data/mock/project-types";
import { projects } from "@/data/mock/projects";
import { API_URL, apiFetch, apiFetchSafe } from "@/lib/http";

import type { Attachment, PaperworkItem, Project, ProjectType } from "./types";

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

export async function listProjectAttachments(
  projectId: number,
  kind?: string
): Promise<Attachment[]> {
  if (API_URL) {
    return apiFetchSafe<Attachment[]>(
      `/attachments?project_id=${projectId}${kind ? `&kind=${kind}` : ""}`,
      []
    );
  }
  return attachments.filter(
    (a) => a.project_id === projectId && (!kind || a.kind === kind)
  );
}

export async function listProjectTypes(): Promise<ProjectType[]> {
  return API_URL
    ? apiFetchSafe<ProjectType[]>("/project-types", [])
    : projectTypes;
}
