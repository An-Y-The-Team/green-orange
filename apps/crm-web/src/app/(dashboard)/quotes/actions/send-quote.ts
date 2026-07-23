"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { API_URL, apiSend } from "@/lib/http";

import { sendQuoteSchema } from "../schema";
import type { Quote } from "../types";

/**
 * Send a quote — allowed from draft|waiting, draft→waiting. The backend writes
 * ONE QuoteSendLog per call, so we loop one POST per selected channel.
 */
export async function sendQuote(
  id: number,
  _prev: ServerActionState,
  input: { channels: string[]; sent_by: string; follow_up_ref?: string }
): Promise<ServerActionState> {
  const parsed = sendQuoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { channels, sent_by, follow_up_ref } = parsed.data;
    let quote: Quote | { id: number } = { id };
    if (API_URL) {
      for (const channel of channels) {
        quote = await apiSend<Quote>(`/quotes/${id}/send`, "POST", {
          channel,
          sent_by,
          follow_up_ref,
        });
      }
    }

    revalidatePath("/projects/[id]", "page");
    revalidatePath("/quotes");
    revalidatePath(`/quotes/${id}`);

    return {
      success: true,
      message: `Đã gửi báo giá (${channels.length} kênh).`,
      data: quote,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể gửi báo giá.",
    };
  }
}
