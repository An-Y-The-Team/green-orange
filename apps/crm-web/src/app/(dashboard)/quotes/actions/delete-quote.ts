"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { apiSend } from "@/utils/http/http";

/** Delete a draft quote (409 from the backend if it isn't a draft). */
export async function deleteQuote(
  id: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    await apiSend<unknown>(`/quotes/${id}`, "DELETE");

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
