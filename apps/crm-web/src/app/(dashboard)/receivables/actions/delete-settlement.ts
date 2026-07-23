"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { API_URL, apiSend } from "@/lib/http";

/**
 * Delete a draft settlement (409 from the backend if not a draft). The paired
 * bill is deleted server-side in the same transaction.
 */
export async function deleteSettlement(
  id: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    if (API_URL) {
      await apiSend(`/settlements/${id}`, "DELETE");
    }

    revalidatePath("/projects/[id]", "page");
    revalidatePath("/receivables");

    return { success: true, message: "Đã xóa quyết toán nháp.", data: { id } };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể xóa quyết toán.",
    };
  }
}
