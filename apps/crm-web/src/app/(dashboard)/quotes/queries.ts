import { quotes } from "@/data/mock/quotes";
import { API_URL, apiFetch, apiFetchSafe } from "@/lib/http";

import { QuoteStatus } from "./enums";
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

/** All versions for a project, newest first (mirrors GET /quotes?project_id=). */
export async function getProjectQuotes(projectId: number): Promise<Quote[]> {
  if (API_URL) {
    return apiFetchSafe<Quote[]>(`/quotes?project_id=${projectId}`, []);
  }
  return quotes
    .filter((q) => q.project_id === projectId)
    .sort((a, b) => b.version - a.version);
}

/**
 * The chốt (deal) quote for a project — drives a contract's line-items block
 * and money merge tokens. Falls back to the latest version when none is deal.
 */
export async function getDealQuote(
  projectId: number
): Promise<Quote | undefined> {
  const versions = await getProjectQuotes(projectId);
  return versions.find((q) => q.status === QuoteStatus.DEAL) ?? versions[0];
}
