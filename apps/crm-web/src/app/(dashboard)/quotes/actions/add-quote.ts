"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { quotes } from "@/data/mock/quotes";
import { API_URL, apiSend, nextId, seq } from "@/lib/http";
import type { Quote } from "@/types";

import { type QuoteFormValues, quoteSchema } from "../schema";

export async function addQuote(
  _prevState: ServerActionState,
  input: QuoteFormValues
): Promise<ServerActionState> {
  const parsed = quoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    // New quotes start as a draft (nháp); the code prefix follows the type.
    const payload = { ...parsed.data, notes: parsed.data.notes ?? "" };
    const id = nextId(quotes);
    const prefix = payload.type === "quyet_toan" ? "QT" : "BG";
    const quote: Quote = API_URL
      ? await apiSend<Quote>("/quotes", "POST", payload)
      : { ...payload, id, code: `${prefix}-2026-${seq(id)}`, status: "nhap" };
    revalidatePath("/quotes");
    return {
      success: true,
      message: `Đã tạo ${prefix === "QT" ? "quyết toán" : "báo giá"} "${quote.code}".`,
      data: quote,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể lưu báo giá.",
    };
  }
}
