import { MAX_PAGE_SIZE } from "@/constants/pagination";
import { apiFetch, apiFetchSafe } from "@/utils/http/http";

import { QuoteStatus } from "./enums";
import type { Quote, QuoteListRow } from "./types";

/**
 * Cross-project list. Rows carry no line items (F22) — use {@link getQuote} for
 * a single quote's items. Asks for the biggest page the API allows because the
 * list page derives "Đã thay thế" and its counts from the whole array; a row
 * count of MAX_PAGE_SIZE means the answer was cut off.
 */
export async function listQuotes(): Promise<QuoteListRow[]> {
  return apiFetchSafe<QuoteListRow[]>(`/quotes?limit=${MAX_PAGE_SIZE}`, []);
}

export async function getQuote(id: number): Promise<Quote | undefined> {
  return apiFetch<Quote>(`/quotes/${id}`).catch(() => undefined);
}

/** All versions for a project, newest first (mirrors GET /quotes?project_id=). */
export async function getProjectQuotes(projectId: number): Promise<Quote[]> {
  return apiFetchSafe<Quote[]>(`/quotes?project_id=${projectId}`, []);
}

/**
 * The chốt (deal) quote for a project — drives a contract's line-items block
 * and money merge tokens. Strictly deal-only: a rejected or draft version must
 * never supply a figure that gets printed on (and spelled out in) a contract.
 */
export async function getDealQuote(
  projectId: number
): Promise<Quote | undefined> {
  const versions = await getProjectQuotes(projectId);
  return versions.find((q) => q.status === QuoteStatus.DEAL);
}
