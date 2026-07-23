"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { attachments } from "@/data/mock/attachments";
import { API_URL, apiSend, nextId } from "@/lib/http";

import type { Attachment } from "../types";

// Metadata-only: the user types a filename; we store it as s3_key (no upload).
const addAttachmentSchema = z.object({
  kind: z.string().min(1),
  filename: z.string().min(1, "Nhập tên tệp."),
  note: z.string().optional(),
});

export type AddAttachmentFormValues = z.infer<typeof addAttachmentSchema>;

export async function addAttachment(
  projectId: number,
  _prev: ServerActionState,
  input: AddAttachmentFormValues
): Promise<ServerActionState> {
  const parsed = addAttachmentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const body = {
      project_id: projectId,
      kind: parsed.data.kind,
      s3_key: parsed.data.filename,
      note: parsed.data.note,
    };
    let data: Attachment;
    if (API_URL) {
      data = await apiSend<Attachment>("/attachments", "POST", body);
    } else {
      data = {
        ...body,
        id: nextId(attachments),
        created_at: new Date().toISOString(),
      };
    }

    revalidatePath(`/projects/${projectId}`);

    return { success: true, message: "Đã thêm tệp.", data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể thêm tệp.",
    };
  }
}

export async function deleteAttachment(
  id: number,
  projectId: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    if (API_URL) {
      await apiSend(`/attachments/${id}`, "DELETE");
    }

    revalidatePath(`/projects/${projectId}`);

    return { success: true, message: "Đã xoá tệp.", data: { id } };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể xoá tệp.",
    };
  }
}
