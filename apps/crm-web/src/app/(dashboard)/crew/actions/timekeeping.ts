"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import {
  ACTION_MESSAGES,
  INVALID_INPUT_MESSAGE,
  NOUNS,
} from "@/constants/server-action";
import { apiSend, toActionError } from "@/utils/http/http";

import { TimekeepingSource, TimekeepingStatus } from "../enums";
import { getProjectAssignments, getProjectTimekeeping } from "../queries";
import type { Assignment, TimekeepingRecord } from "../types";

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
    return {
      success: true,
      message: ACTION_MESSAGES.saved(NOUNS.timesheet),
      data: record,
    };
  } catch (error) {
    return {
      success: false,
      message: toActionError(
        error,
        ACTION_MESSAGES.saveFailed(NOUNS.timesheet)
      ),
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
    return { success: true, message: ACTION_MESSAGES.deleted(NOUNS.timesheet) };
  } catch (error) {
    return {
      success: false,
      message: toActionError(
        error,
        ACTION_MESSAGES.deleteFailed(NOUNS.timesheet)
      ),
    };
  }
}

// Duyệt / từ chối a pending mini-app submission. POST /timekeeping/:id/decide
// 409s unless the row is pending (an approved day cannot be flipped; the
// worker resubmitting is what turns a rejected day back to pending).
const decideSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum([TimekeepingStatus.APPROVED, TimekeepingStatus.REJECTED]),
});

export type DecideTimekeepingValues = z.infer<typeof decideSchema>;

export async function decideTimekeeping(
  _prev: ServerActionState,
  input: DecideTimekeepingValues
): Promise<ServerActionState> {
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: INVALID_INPUT_MESSAGE };
  }

  const approved = parsed.data.status === TimekeepingStatus.APPROVED;
  try {
    await apiSend<TimekeepingRecord>(
      `/timekeeping/${parsed.data.id}/decide`,
      "POST",
      { status: parsed.data.status }
    );
    revalidatePath("/crew");
    return {
      success: true,
      message: approved
        ? `Đã duyệt ${NOUNS.timesheet}.`
        : `Đã từ chối ${NOUNS.timesheet}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: toActionError(
        error,
        ACTION_MESSAGES.updateFailed(NOUNS.timesheet)
      ),
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

/**
 * The project's phân công, so the grid's rows are the people actually on this
 * công trình instead of the whole roster — the secretary was scrolling 40 rows
 * to enter hours for the four who worked. Client-side loader because the tab
 * picks its project after the page has rendered.
 */
export async function loadProjectAssignments(
  projectId: number
): Promise<Assignment[]> {
  if (!Number.isInteger(projectId) || projectId <= 0) return [];
  return getProjectAssignments(projectId);
}
