"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { API_URL, apiSend } from "@/lib/http";

import type { ProjectNote } from "../types";

export const addNoteSchema = z.object({
  body: z.string().min(1),
  tag: z.string().optional(),
});

export type AddNoteFormValues = z.infer<typeof addNoteSchema>;

export async function addNote(
  projectId: number,
  _prev: ServerActionState,
  input: AddNoteFormValues
): Promise<ServerActionState> {
  const parsed = addNoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    let note: ProjectNote;
    if (API_URL) {
      note = await apiSend<ProjectNote>("/project-notes", "POST", {
        project_id: projectId,
        ...parsed.data,
      });
    } else {
      note = {
        id: Date.now(),
        project_id: projectId,
        body: parsed.data.body,
        tag: parsed.data.tag ?? null,
        created_at: new Date().toISOString(),
      };
    }

    revalidatePath(`/projects/${projectId}`);

    return { success: true, message: "Đã thêm ghi chú.", data: note };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể thêm ghi chú.",
    };
  }
}
