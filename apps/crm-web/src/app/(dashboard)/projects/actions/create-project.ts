"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { projects } from "@/data/mock/projects";
import { API_URL, apiSend, nextId, seq } from "@/utils/http/http";

import { type CreateProjectFormValues, createProjectSchema } from "../schema";
import type { Project } from "../types";

export async function createProject(
  _prev: ServerActionState,
  input: CreateProjectFormValues
): Promise<ServerActionState> {
  const parsed = createProjectSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  // POST /projects takes everything, incl. optional `stage` and appointment_at.
  // One write only: a follow-up PATCH that failed used to report failure on an
  // already-committed project, so the operator re-submitted and duplicated the
  // CT code. `createBody` is the mock branch's shape (appointment_at split out).
  const { appointment_at, ...createBody } = parsed.data;

  try {
    let project: Project;
    if (API_URL) {
      project = await apiSend<Project>("/projects", "POST", parsed.data);
    } else {
      const id = nextId(projects);
      project = {
        ...createBody,
        id,
        code: `CT-2026-${seq(id)}`,
        working_contact_id: createBody.working_contact_id ?? 0,
        decision_maker_contact_id: createBody.decision_maker_contact_id ?? 0,
        stage: createBody.stage,
        status: "active",
        appointment_at: appointment_at ?? null,
        types: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Project;
    }

    revalidatePath("/projects");

    return {
      success: true,
      message: `Đã tạo công trình "${project.name}".`,
      data: project,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể tạo công trình.",
    };
  }
}
