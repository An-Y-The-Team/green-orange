"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { API_URL, apiSend } from "@/lib/http";

import { updateQuoteSchema } from "../schema";
import type { Quote } from "../types";

/**
 * PATCH a draft quote (409 from the backend if it isn't a draft). Sending
 * `items` replaces them; the server recomputes amounts + total. Unknown keys
 * such as `project_id` are stripped by the schema, so the builder can post one
 * create-shaped payload to either action.
 */
export async function updateQuote(
  id: number,
  _prev: ServerActionState,
  input: unknown
): Promise<ServerActionState> {
  const parsed = updateQuoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    let quote: Quote | { id: number };
    if (API_URL) {
      quote = await apiSend<Quote>(`/quotes/${id}`, "PATCH", parsed.data);
    } else {
      quote = { id };
    }

    revalidatePath("/projects/[id]", "page");
    revalidatePath("/quotes");
    revalidatePath(`/quotes/${id}`);

    return { success: true, message: "Đã cập nhật báo giá nháp.", data: quote };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể cập nhật báo giá.",
    };
  }
}
