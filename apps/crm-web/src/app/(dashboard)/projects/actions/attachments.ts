"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import {
  ACTION_MESSAGES,
  INVALID_INPUT_MESSAGE,
  NOUNS,
} from "@/constants/server-action";
import { apiFetch, apiSend, toActionError } from "@/utils/http/http";

import { AttachmentKind } from "../enums";
import type { Attachment, AttachmentPresign } from "../types";

/**
 * Upload is a three-step dance, and only the two ends run here:
 *
 *   1. `presignAttachment` — this file, server-side, asks crm-api for a signed URL
 *   2. the browser PUTs the bytes straight to the bucket (see attachment-upload)
 *   3. `addAttachment` — this file, records the row against the returned s3_key
 *
 * Step 2 cannot run here: CRM_API_URL is server-only and the bucket is not, but
 * more to the point a server action would pull every byte through the Next
 * process (and past its 1 MB body limit) for nothing.
 */
const presignSchema = z.object({
  filename: z.string().min(1),
  content_type: z.string().min(1),
  content_length: z.number().int().positive(),
});

export type PresignAttachmentInput = z.infer<typeof presignSchema>;

export async function presignAttachment(
  projectId: number,
  input: PresignAttachmentInput
): Promise<ServerActionState<AttachmentPresign>> {
  const parsed = presignSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: INVALID_INPUT_MESSAGE,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const data = await apiSend<AttachmentPresign>(
      "/attachments/presign",
      "POST",
      { project_id: projectId, ...parsed.data }
    );

    return { success: true, message: "Đã sẵn sàng tải lên.", data };
  } catch (error) {
    return {
      success: false,
      message: toActionError(
        error,
        ACTION_MESSAGES.addFailed(NOUNS.attachment)
      ),
    };
  }
}

/** Records the row once the bytes are already in the bucket. */
const addAttachmentSchema = z.object({
  kind: z.nativeEnum(AttachmentKind),
  s3_key: z.string().min(1, "Thiếu tệp đã tải lên."),
  paperwork_item_id: z.number().int().optional(),
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
      message: INVALID_INPUT_MESSAGE,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const body = {
      project_id: projectId,
      kind: parsed.data.kind,
      s3_key: parsed.data.s3_key,
      paperwork_item_id: parsed.data.paperwork_item_id,
      note: parsed.data.note,
    };
    const data = await apiSend<Attachment>("/attachments", "POST", body);

    revalidatePath(`/projects/${projectId}`);

    return {
      success: true,
      message: ACTION_MESSAGES.added(NOUNS.attachment),
      data,
    };
  } catch (error) {
    return {
      success: false,
      message: toActionError(
        error,
        ACTION_MESSAGES.addFailed(NOUNS.attachment)
      ),
    };
  }
}

/**
 * A signed, short-lived download URL. Minted per click rather than listed with
 * the rows: a URL that expires in five minutes is useless in server-rendered
 * HTML the user may leave open for an hour.
 */
export async function getAttachmentUrl(
  id: number
): Promise<ServerActionState<{ download_url: string }>> {
  try {
    const data = await apiFetch<{ download_url: string }>(
      `/attachments/${id}/url`
    );

    return { success: true, message: "Đang tải tệp.", data };
  } catch (error) {
    return {
      success: false,
      message: toActionError(error, "Không thể tải tệp."),
    };
  }
}

export async function deleteAttachment(
  id: number,
  projectId: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    await apiSend(`/attachments/${id}`, "DELETE");

    revalidatePath(`/projects/${projectId}`);

    return { success: true, message: "Đã xoá tệp.", data: { id } };
  } catch (error) {
    return {
      success: false,
      message: toActionError(error, "Không thể xoá tệp."),
    };
  }
}
