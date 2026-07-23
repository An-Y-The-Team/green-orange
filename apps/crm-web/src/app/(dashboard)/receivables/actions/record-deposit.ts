"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { paymentMilestones } from "@/data/mock/payment-milestones";
import { API_URL, apiSend, nextId } from "@/lib/http";

import { MilestoneStatus, MilestoneType } from "../enums";
import type { PaymentMilestone } from "../types";

const recordDepositSchema = z.object({
  amount: z.coerce.number().int().nonnegative(),
  received_date: z.string().min(1, "Chọn ngày nhận cọc"),
});
export type RecordDepositFormValues = z.infer<typeof recordDepositSchema>;

/**
 * Record the stage-4 deposit (Tạm ứng): a pre-bill deposit milestone marked
 * paid. Live mode POSTs the milestone then advances it one step at a time
 * (server enforces not_due → awaiting_payment → paid). Mock synths a paid row.
 */
export async function recordDeposit(
  projectId: number,
  _prev: ServerActionState,
  input: RecordDepositFormValues
): Promise<ServerActionState> {
  const parsed = recordDepositSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { amount, received_date } = parsed.data;

  try {
    let milestone: PaymentMilestone;
    if (API_URL) {
      const created = await apiSend<PaymentMilestone>(
        "/payment-milestones",
        "POST",
        { project_id: projectId, type: MilestoneType.DEPOSIT, amount }
      );
      await apiSend<PaymentMilestone>(
        `/payment-milestones/${created.id}`,
        "PATCH",
        { status: MilestoneStatus.AWAITING_PAYMENT }
      );
      milestone = await apiSend<PaymentMilestone>(
        `/payment-milestones/${created.id}`,
        "PATCH",
        { status: MilestoneStatus.PAID, paid_date: received_date }
      );
    } else {
      milestone = {
        id: nextId(paymentMilestones),
        project_id: projectId,
        bill_id: null,
        type: MilestoneType.DEPOSIT,
        amount,
        due_date: null,
        status: MilestoneStatus.PAID,
        paid_date: received_date,
      };
    }

    revalidatePath(`/projects/${projectId}`);

    return { success: true, message: "Đã ghi nhận cọc.", data: milestone };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể ghi nhận cọc.",
    };
  }
}
