"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import {
  ACTION_MESSAGES,
  INVALID_INPUT_MESSAGE,
  NOUNS,
} from "@/constants/server-action";
import { apiSend } from "@/utils/http/http";

import { MilestoneStatus, MilestoneType } from "../enums";
import type { PaymentMilestone } from "../types";

function revalidate(projectId: number) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/receivables");
}

function fail(message: string): ServerActionState {
  return { success: false, message };
}

// ---- create ---------------------------------------------------------------

const createSchema = z.object({
  bill_id: z.number().int().positive().optional(),
  type: z.nativeEnum(MilestoneType).default(MilestoneType.PROGRESS),
  amount: z.coerce.number().int().nonnegative(),
  due_date: z.string().optional(),
});
export type CreateMilestoneInput = z.input<typeof createSchema>;

/** Add a payment đợt (starts not_due). Used by [+ Thêm đợt]. */
export async function createMilestone(
  projectId: number,
  _prev: ServerActionState,
  input: CreateMilestoneInput
): Promise<ServerActionState> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_INPUT_MESSAGE);

  try {
    const milestone = await apiSend<PaymentMilestone>(
      "/payment-milestones",
      "POST",
      { project_id: projectId, ...parsed.data }
    );

    revalidate(projectId);
    return {
      success: true,
      message: ACTION_MESSAGES.added(NOUNS.milestone),
      data: milestone,
    };
  } catch (error) {
    return fail(
      error instanceof Error
        ? error.message
        : ACTION_MESSAGES.addFailed(NOUNS.milestone)
    );
  }
}

// ---- update ---------------------------------------------------------------

const updateSchema = z.object({
  status: z.nativeEnum(MilestoneStatus).optional(),
  amount: z.coerce.number().int().nonnegative().optional(),
  due_date: z.string().optional(),
  bill_id: z.number().int().positive().nullable().optional(),
});
export type UpdateMilestoneInput = z.input<typeof updateSchema>;

/** PATCH a milestone (amount/due_date free; status one-step). */
export async function updateMilestone(
  id: number,
  projectId: number,
  _prev: ServerActionState,
  input: UpdateMilestoneInput
): Promise<ServerActionState> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_INPUT_MESSAGE);

  try {
    const milestone = await apiSend<PaymentMilestone>(
      `/payment-milestones/${id}`,
      "PATCH",
      parsed.data
    );

    revalidate(projectId);
    return {
      success: true,
      message: ACTION_MESSAGES.updated(NOUNS.milestone),
      data: milestone,
    };
  } catch (error) {
    return fail(
      error instanceof Error
        ? error.message
        : ACTION_MESSAGES.updateFailed(NOUNS.milestone)
    );
  }
}

// ---- mark paid ------------------------------------------------------------

const markPaidSchema = z.object({
  paid_date: z.string().min(1, "Chọn ngày thu"),
});
export type MarkMilestonePaidInput = z.infer<typeof markPaidSchema>;

/**
 * Step a milestone to paid. Status is one-step server-side, so from not_due we
 * PATCH awaiting_payment THEN paid; from awaiting_payment a single PATCH does
 * it. →paid auto-stamps paid_date (we still send the chosen date).
 */
export async function markMilestonePaid(
  id: number,
  projectId: number,
  fromStatus: MilestoneStatus,
  _prev: ServerActionState,
  input: MarkMilestonePaidInput
): Promise<ServerActionState> {
  const parsed = markPaidSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: INVALID_INPUT_MESSAGE,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    if (fromStatus === MilestoneStatus.NOT_DUE) {
      await apiSend<PaymentMilestone>(`/payment-milestones/${id}`, "PATCH", {
        status: MilestoneStatus.AWAITING_PAYMENT,
      });
    }
    const milestone = await apiSend<PaymentMilestone>(
      `/payment-milestones/${id}`,
      "PATCH",
      { status: MilestoneStatus.PAID, paid_date: parsed.data.paid_date }
    );

    revalidate(projectId);
    return { success: true, message: "Đã ghi nhận đã thu.", data: milestone };
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Không thể ghi nhận đã thu."
    );
  }
}

// ---- delete ---------------------------------------------------------------

/** Delete a milestone (backend rejects unless not_due). */
export async function deleteMilestone(
  id: number,
  projectId: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    await apiSend<unknown>(`/payment-milestones/${id}`, "DELETE");

    revalidate(projectId);
    return {
      success: true,
      message: ACTION_MESSAGES.deleted(NOUNS.milestone),
      data: { id },
    };
  } catch (error) {
    return fail(
      error instanceof Error
        ? error.message
        : ACTION_MESSAGES.deleteFailed(NOUNS.milestone)
    );
  }
}
