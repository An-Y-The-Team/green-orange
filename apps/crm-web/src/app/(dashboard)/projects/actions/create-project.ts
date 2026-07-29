"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { apiSend } from "@/utils/http/http";

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
  // `type_ids` is write-only: the API returns the joined `types` rows instead.
  // One write only: a follow-up PATCH that failed used to report failure on an
  // already-committed project, so the operator re-submitted and duplicated the
  // CT code.
  try {
    const project = await apiSend<Project>("/projects", "POST", parsed.data);

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
