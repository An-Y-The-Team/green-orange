"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { apiSend } from "@/utils/http/http";

import { BillStatus } from "../enums";
import type { Bill } from "../types";

// Forward-only status (server enforces the index order). →sent/→paid auto-stamp
// their dates server-side; explicit dates stay accepted so a caller can override
// the stamp with a back-dated one.
const updateBillSchema = z.object({
  status: z.nativeEnum(BillStatus).optional(),
  sent_date: z.string().optional(),
  paid_date: z.string().optional(),
});
export type UpdateBillInput = z.infer<typeof updateBillSchema>;

/** PATCH a bill — drives the [Đã gửi] / [Đã thu] flips on the settlement card. */
export async function updateBill(
  id: number,
  projectId: number,
  _prev: ServerActionState,
  input: UpdateBillInput
): Promise<ServerActionState> {
  const parsed = updateBillSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const bill = await apiSend<Bill>(`/bills/${id}`, "PATCH", parsed.data);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/receivables");

    return { success: true, message: "Đã cập nhật hóa đơn.", data: bill };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể cập nhật hóa đơn.",
    };
  }
}
