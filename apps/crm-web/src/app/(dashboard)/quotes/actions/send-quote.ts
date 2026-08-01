"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import {
  ACTION_MESSAGES,
  INVALID_INPUT_MESSAGE,
  NOUNS,
} from "@/constants/server-action";
import { apiSend } from "@/utils/http/http";

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
      message: INVALID_INPUT_MESSAGE,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { channels, sent_by, follow_up_ref } = parsed.data;
    // Schema guarantees at least one channel, but TS can't see that through the
    // loop — the initializer keeps `{ id }` as the type-level floor for `data`.
    let quote: Quote | { id: number } = { id };
    for (const channel of channels) {
      quote = await apiSend<Quote>(`/quotes/${id}/send`, "POST", {
        channel,
        sent_by,
        follow_up_ref,
      });
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
        error instanceof Error
          ? error.message
          : ACTION_MESSAGES.sendFailed(NOUNS.quote),
    };
  }
}
