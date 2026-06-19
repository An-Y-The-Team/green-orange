"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { projects } from "@/data/mock/projects";
import { API_URL, apiSend, nextId, seq } from "@/lib/http";

import { ProjectStage } from "../enums";
import { type ProjectFormValues, projectSchema } from "../schema";
import type { Project } from "../types";

export async function addProject(
  _prevState: ServerActionState,
  input: ProjectFormValues
): Promise<ServerActionState> {
  const parsed = projectSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    // A new công trình enters the lifecycle at the first stage, 0% progress.
    const id = nextId(projects);
    const project: Project = API_URL
      ? await apiSend<Project>("/projects", "POST", parsed.data)
      : {
          ...parsed.data,
          id,
          code: `CT-2026-${seq(id)}`,
          stage: ProjectStage.YEU_CAU,
          progress: 0,
        };
    revalidatePath("/projects");
    return {
      success: true,
      message: `Đã tạo công trình "${project.name}" (${project.code}).`,
      data: project,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể lưu công trình.",
    };
  }
}
