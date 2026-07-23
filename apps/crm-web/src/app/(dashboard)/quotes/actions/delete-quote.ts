"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { API_URL, apiSend } from "@/lib/http";

/** Delete a draft quote (409 from the backend if it isn't a draft). */
export async function deleteQuote(
  id: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    if (API_URL) {
      await apiSend<unknown>(`/quotes/${id}`, "DELETE");
    }

    revalidatePath("/projects/[id]", "page");
    revalidatePath("/quotes");

    return { success: true, message: "Đã xóa báo giá nháp.", data: { id } };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể xóa báo giá.",
    };
  }
}
