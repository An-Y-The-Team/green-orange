"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { apiSend } from "@/utils/http/http";

import type { Quote } from "../types";

/**
 * Bargaining — copy a quote's items+vat+note into a NEW draft (version = next).
 * The caller redirects to the builder in edit mode on the returned draft.
 */
export async function reviseQuote(
  id: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    const quote = await apiSend<Quote>(`/quotes/${id}/revise`, "POST");

    revalidatePath("/projects/[id]", "page");
    revalidatePath("/quotes");

    return { success: true, message: "Đã tạo phiên bản mới.", data: quote };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể tạo phiên bản mới.",
    };
  }
}
