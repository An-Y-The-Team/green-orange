"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { quotes } from "@/data/mock/quotes";
import { API_URL, apiSend, nextId } from "@/lib/http";

import { QuoteStatus } from "../enums";
import { type CreateQuoteInput, createQuoteSchema } from "../schema";
import type { Quote } from "../types";

/**
 * Create a new draft quote (version = next per project). The server computes
 * each item `amount` + `total_amount`; in mock mode we synthesise them so the
 * builder flow is demoable without a backend.
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
    let quote: Quote;
    if (API_URL) {
      quote = await apiSend<Quote>("/quotes", "POST", parsed.data);
    } else {
      const { project_id, vat_rate, note, items } = parsed.data;
      const priced = items.map((it, i) => ({
        ...it,
        unit: it.unit ?? null,
        amount: Math.round(it.quantity * it.unit_price),
        sort_order: i,
      }));
      const version =
        Math.max(
          0,
          ...quotes
            .filter((q) => q.project_id === project_id)
            .map((q) => q.version)
        ) + 1;
      quote = {
        id: nextId(quotes),
        project_id,
        version,
        status: QuoteStatus.DRAFT,
        total_amount: priced.reduce((s, it) => s + it.amount, 0),
        vat_rate,
        note: note ?? null,
        items: priced,
        send_logs: [],
      };
    }

    revalidatePath(`/projects/${quote.project_id}`);
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
