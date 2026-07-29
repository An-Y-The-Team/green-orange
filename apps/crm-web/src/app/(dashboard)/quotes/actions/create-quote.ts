"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { apiSend } from "@/utils/http/http";

import { type CreateQuoteInput, createQuoteSchema } from "../schema";
import type { Quote } from "../types";

/**
 * Create a new draft quote (version = next per project). The server computes
 * the version, each item `amount` and `total_amount`.
 */
export async function createQuote(
  _prev: ServerActionState,
  input: CreateQuoteInput
): Promise<ServerActionState> {
  const parsed = createQuoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const quote = await apiSend<Quote>("/quotes", "POST", parsed.data);

    if (quote.project_id) revalidatePath(`/projects/${quote.project_id}`);
    revalidatePath("/quotes");

    return { success: true, message: "Đã lưu báo giá nháp.", data: quote };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể lưu báo giá.",
    };
  }
}
