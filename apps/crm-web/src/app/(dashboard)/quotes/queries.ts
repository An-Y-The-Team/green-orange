import { quotes } from "@/data/mock/quotes";
import { API_URL, apiFetch, apiFetchSafe } from "@/lib/http";
import type { Quote } from "@/types";

export async function listQuotes(): Promise<Quote[]> {
  return API_URL ? apiFetchSafe<Quote[]>("/quotes", []) : quotes;
}

export async function getQuote(id: number): Promise<Quote | undefined> {
  if (API_URL) {
    return apiFetch<Quote>(`/quotes/${id}`).catch(() => undefined);
  }
  return quotes.find((q) => q.id === id);
}
