"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { API_URL, apiSend } from "@/lib/http";

import { BillStatus } from "../enums";
import type { Bill } from "../types";

// Forward-only status (server enforces the index order). →sent/→paid auto-stamp
// their dates server-side; we still accept explicit dates for the mock echo.
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
    let bill: Bill | { id: number };
    if (API_URL) {
      bill = await apiSend<Bill>(`/bills/${id}`, "PATCH", parsed.data);
    } else {
      bill = { id };
    }

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
