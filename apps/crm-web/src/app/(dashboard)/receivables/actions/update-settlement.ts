"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { API_URL, apiSend } from "@/lib/http";

import { updateSettlementSchema } from "../schema";
import type { Settlement } from "../types";

/**
 * PATCH a settlement (409 from the backend if editing items on a non-draft).
 * Sending `items` replaces them draft-only; the server recomputes amounts +
 * total. Unknown keys (e.g. project_id) are stripped, so the builder can post
 * one create-shaped payload to either action.
 */
export async function updateSettlement(
  id: number,
  _prev: ServerActionState,
  input: unknown
): Promise<ServerActionState> {
  const parsed = updateSettlementSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    let settlement: Settlement | { id: number };
    if (API_URL) {
      settlement = await apiSend<Settlement>(
        `/settlements/${id}`,
        "PATCH",
        parsed.data
      );
    } else {
      settlement = { id };
    }

    revalidatePath("/projects/[id]", "page");
    revalidatePath("/receivables");

    return {
      success: true,
      message: "Đã cập nhật quyết toán.",
      data: settlement,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Không thể cập nhật quyết toán.",
    };
  }
}
