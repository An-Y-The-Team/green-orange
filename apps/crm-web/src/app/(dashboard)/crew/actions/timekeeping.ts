"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { apiSend } from "@/utils/http/http";

import { TimekeepingSource } from "../enums";
import { getProjectTimekeeping } from "../queries";
import type { TimekeepingRecord } from "../types";

// Chấm công writes. POST /timekeeping is an UPSERT on
// (crew_member_id, project_id, work_date, source) — re-posting the same key
// overwrites hours/note. The UI only ever writes source:"manual"; zalo_app rows
// are ingested elsewhere and stay read-only. There is no PATCH — upsert IS the
// edit path. 409 if the project is closed (surfaced as the error message).
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ.");

const upsertSchema = z.object({
  crew_member_id: z.number().int().positive(),
  work_date: isoDate,
  hours: z.number().min(0),
  note: z.string().optional(),
});

export type UpsertTimekeepingValues = z.infer<typeof upsertSchema>;

export async function upsertTimekeeping(
  projectId: number,
  _prev: ServerActionState,
  input: UpsertTimekeepingValues
): Promise<ServerActionState> {
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại giờ công.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const record = await apiSend<TimekeepingRecord>("/timekeeping", "POST", {
      project_id: projectId,
      source: TimekeepingSource.MANUAL,
      ...parsed.data,
    });

    revalidatePath("/crew");
    return { success: true, message: "Đã lưu giờ công.", data: record };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể lưu giờ công.",
    };
  }
}

export async function deleteTimekeeping(
  id: number,
  _projectId: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    await apiSend<void>(`/timekeeping/${id}`, "DELETE");
    revalidatePath("/crew");
    return { success: true, message: "Đã xóa giờ công." };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể xóa giờ công.",
    };
  }
}

// The window is part of the request, not a default: GET /timekeeping without
// from/to only answers with the last 31 days, so a grid showing last March must
// ask for last March.
const loadSchema = z.object({
  projectId: z.number().int().positive(),
  range: z.object({ from: isoDate, to: isoDate }),
});

/** Loader so the client grid can (re)fetch the week it renders. */
export async function loadProjectTimekeeping(
  input: z.infer<typeof loadSchema>
): Promise<TimekeepingRecord[]> {
  const parsed = loadSchema.safeParse(input);
  // A read has no error channel — a mangled window returns nothing rather than
  // interpolating junk into the query string.
  if (!parsed.success) return [];
  return getProjectTimekeeping(parsed.data);
}
