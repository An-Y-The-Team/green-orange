"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { projects } from "@/data/mock/projects";
import { API_URL, apiSend, nextId, seq } from "@/lib/http";

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

  // POST /projects takes everything except appointment_at, which is only
  // settable via PATCH (see NEST contract). `stage` is held back from the
  // live POST — the backend doesn't accept it yet (pending 2026-07-24 delta:
  // POST /projects with optional stage). ponytail: add `stage` to createBody
  // once that delta lands; mock already honors it.
  const { appointment_at, stage, ...createBody } = parsed.data;

  try {
    let project: Project;
    if (API_URL) {
      project = await apiSend<Project>("/projects", "POST", createBody);
      if (appointment_at) {
        project = await apiSend<Project>(`/projects/${project.id}`, "PATCH", {
          appointment_at,
        });
      }
    } else {
      const id = nextId(projects);
      project = {
        ...createBody,
        id,
        code: `CT-2026-${seq(id)}`,
        working_contact_id: createBody.working_contact_id ?? 0,
        decision_maker_contact_id: createBody.decision_maker_contact_id ?? 0,
        stage,
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
