"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { apiSend } from "@/utils/http/http";

import { PaperworkStatus } from "../enums";
import type { PaperworkItem } from "../types";

// Stage-5 checklist mutations. The one-way stepper (preparing→submitted→approved)
// is enforced UI-side — the backend PATCH has no forward-only guard.

const createSchema = z.object({
  name: z.string().min(1),
  due_date: z.string().optional(),
  note: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.nativeEnum(PaperworkStatus).optional(),
  due_date: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export type CreatePaperworkValues = z.infer<typeof createSchema>;
export type UpdatePaperworkValues = z.infer<typeof updateSchema>;

export async function createPaperworkItem(
  projectId: number,
  _prev: ServerActionState,
  input: CreatePaperworkValues
): Promise<ServerActionState> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const item = await apiSend<PaperworkItem>("/paperwork-items", "POST", {
      project_id: projectId,
      ...parsed.data,
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: `Đã thêm "${item.name}".`, data: item };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể thêm mục.",
    };
  }
}

export async function updatePaperworkItem(
  id: number,
  projectId: number,
  _prev: ServerActionState,
  input: UpdatePaperworkValues
): Promise<ServerActionState> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const item = await apiSend<PaperworkItem>(
      `/paperwork-items/${id}`,
      "PATCH",
      parsed.data
    );

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã cập nhật.", data: item };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể cập nhật mục.",
    };
  }
}

export async function deletePaperworkItem(
  id: number,
  projectId: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    await apiSend<void>(`/paperwork-items/${id}`, "DELETE");
    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa mục." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể xóa mục.",
    };
  }
}
