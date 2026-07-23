"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { quotes } from "@/data/mock/quotes";
import { API_URL, apiSend, nextId } from "@/lib/http";

import { QuoteStatus } from "../enums";
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
    let quote: Quote;
    if (API_URL) {
      quote = await apiSend<Quote>(`/quotes/${id}/revise`, "POST");
    } else {
      const source = quotes.find((q) => q.id === id);
      if (!source) throw new Error("Không tìm thấy báo giá.");
      const version =
        Math.max(
          0,
          ...quotes
            .filter((q) => q.project_id === source.project_id)
            .map((q) => q.version)
        ) + 1;
      quote = {
        ...source,
        id: nextId(quotes),
        version,
        status: QuoteStatus.DRAFT,
        decided_date: null,
        items: source.items.map((it) => ({ ...it })),
        send_logs: [],
      };
    }

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
