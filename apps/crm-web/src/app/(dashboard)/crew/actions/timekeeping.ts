"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { API_URL, apiSend } from "@/lib/http";

import { TimekeepingSource } from "../enums";
import { getProjectTimekeeping } from "../queries";
import type { TimekeepingRecord } from "../types";

// Chấm công writes. POST /timekeeping is an UPSERT on
// (crew_member_id, project_id, work_date, source) — re-posting the same key
// overwrites hours/note. The UI only ever writes source:"manual"; zalo_app rows
// are ingested elsewhere and stay read-only. There is no PATCH — upsert IS the
// edit path. 409 if the project is closed (surfaced as the error message).
const upsertSchema = z.object({
  crew_member_id: z.number().int().positive(),
  work_date: z.string(), // 'YYYY-MM-DD'
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
    let record: TimekeepingRecord;
    if (API_URL) {
      record = await apiSend<TimekeepingRecord>("/timekeeping", "POST", {
        project_id: projectId,
        source: TimekeepingSource.MANUAL,
        ...parsed.data,
      });
    } else {
      // Mock echo — not persisted (revalidate re-reads the static array).
      record = {
        id: Date.now(),
        project_id: projectId,
        source: TimekeepingSource.MANUAL,
        crew_member_id: parsed.data.crew_member_id,
        work_date: parsed.data.work_date,
        hours: parsed.data.hours,
        note: parsed.data.note ?? null,
      };
    }

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
    if (API_URL) {
      await apiSend<void>(`/timekeeping/${id}`, "DELETE");
    }
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

/** Loader so the client grid can (re)fetch after picking a project / editing. */
export async function loadProjectTimekeeping(
  projectId: number
): Promise<TimekeepingRecord[]> {
  return getProjectTimekeeping(projectId);
}
