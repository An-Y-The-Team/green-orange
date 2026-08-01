"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { ACTION_MESSAGES, NOUNS } from "@/constants/server-action";
import { apiSend } from "@/utils/http/http";

import type { ProjectType } from "../types";

// name is required for create AND rename (PATCH /project-types/:id {name}).
const nameSchema = z.object({ name: z.string().min(1) });
export type ProjectTypeFormValues = z.infer<typeof nameSchema>;

function revalidate() {
  revalidatePath("/settings");
  revalidatePath("/projects/new"); // intake reads the type list
  revalidatePath("/projects/[id]", "page"); // so does the workspace header's edit form
}

export async function createProjectType(
  _prev: ServerActionState,
  input: ProjectTypeFormValues
): Promise<ServerActionState> {
  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng nhập tên loại công trình.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const data = await apiSend<ProjectType>(
      "/project-types",
      "POST",
      parsed.data
    );
    revalidate();
    return {
      success: true,
      message: ACTION_MESSAGES.added(`"${data.name}"`),
      data,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : ACTION_MESSAGES.addFailed(NOUNS.projectType),
    };
  }
}

export async function renameProjectType(
  id: number,
  _prev: ServerActionState,
  input: ProjectTypeFormValues
): Promise<ServerActionState> {
  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng nhập tên loại công trình.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const data = await apiSend<ProjectType>(
      `/project-types/${id}`,
      "PATCH",
      parsed.data
    );
    revalidate();
    return { success: true, message: "Đã cập nhật.", data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể cập nhật.",
    };
  }
}

export async function deleteProjectType(
  id: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    await apiSend(`/project-types/${id}`, "DELETE");
    revalidate();
    return {
      success: true,
      message: ACTION_MESSAGES.deleted(NOUNS.projectType),
      data: { id },
    };
  } catch (error) {
    // 409 when still referenced. apiSend surfaces only the status line, not the
    // JSON body, so the referencing count (N) isn't available here.
    const msg = error instanceof Error ? error.message : "";
    return {
      success: false,
      message: msg.includes("409")
        ? "Loại công trình đang được sử dụng bởi công trình khác, không thể xóa."
        : msg || ACTION_MESSAGES.deleteFailed(NOUNS.projectType),
    };
  }
}
