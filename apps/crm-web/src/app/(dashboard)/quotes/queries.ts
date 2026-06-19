import { quotes } from "@/data/mock/quotes";
import { API_URL, apiFetch, apiFetchSafe } from "@/lib/http";

import { QuoteType } from "./enums";
import type { Quote } from "./types";

export async function listQuotes(): Promise<Quote[]> {
  return API_URL ? apiFetchSafe<Quote[]>("/quotes", []) : quotes;
}

export async function getQuote(id: number): Promise<Quote | undefined> {
  if (API_URL) {
    return apiFetch<Quote>(`/quotes/${id}`).catch(() => undefined);
  }
  return quotes.find((q) => q.id === id);
}

/**
 * The báo giá (initial quote) for a project — drives a contract's line-items
 * block. Prefers `type: "bao_gia"`; falls back to any quote for the project.
 */
export async function getQuoteByProjectCode(
  projectCode: string
): Promise<Quote | undefined> {
  const all = await listQuotes();
  return (
    all.find(
      (q) => q.project_code === projectCode && q.type === QuoteType.BAO_GIA
    ) ?? all.find((q) => q.project_code === projectCode)
  );
}
