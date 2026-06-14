"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { paymentMilestones } from "@/data/mock/payment-milestones";
import { API_URL, apiSend, nextId } from "@/lib/http";
import type { PaymentMilestone } from "@/types";

import { type MilestoneFormValues, milestoneSchema } from "../schema";

export async function addPaymentMilestone(
  _prevState: ServerActionState,
  input: MilestoneFormValues
): Promise<ServerActionState> {
  const parsed = milestoneSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    // A new đợt starts unpaid and not-yet-due.
    const milestone: PaymentMilestone = API_URL
      ? await apiSend<PaymentMilestone>(
          "/payment-milestones",
          "POST",
          parsed.data
        )
      : {
          ...parsed.data,
          id: nextId(paymentMilestones),
          status: "chua_den_han",
          paid_amount: 0,
        };
    revalidatePath("/receivables");
    return {
      success: true,
      message: `Đã thêm đợt thanh toán "${milestone.name}".`,
      data: milestone,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Không thể lưu đợt thanh toán.",
    };
  }
}
