import { MAX_PAGE_SIZE } from "@/constants/pagination";
import { apiFetchDetail, apiFetchSafe } from "@/utils/http/http";

import { QuoteStatus } from "./enums";
import type { Quote, QuoteListRow } from "./types";

/**
 * Cross-project list. Rows carry no line items (F22) — use {@link getQuote} for
 * a single quote's items — but they do carry `is_latest`, computed server-side,
 * so "Đã thay thế" no longer depends on which rows landed on this page. Asks for
 * the biggest page the API allows because the header counts still aggregate the
 * whole array; a row count of MAX_PAGE_SIZE means the answer was cut off.
 */
export async function listQuotes(): Promise<QuoteListRow[]> {
  return apiFetchSafe<QuoteListRow[]>(`/quotes?limit=${MAX_PAGE_SIZE}`, []);
}

export async function getQuote(id: number): Promise<Quote | undefined> {
  return apiFetchDetail<Quote>(`/quotes/${id}`);
}

/**
 * A saved quote's content as builder-form values — shared by the edit page and
 * the ?copy= revise flow. The caller adds projectId/version/editId.
 */
export function quoteFormSeed(quote: Quote) {
  return {
    items: quote.items.map((it) => ({
      category: it.category ?? undefined,
      description: it.description,
      unit: it.unit ?? undefined,
      quantity: it.quantity,
      unit_price: it.unit_price,
    })),
    vatPercent: Math.round(quote.vat_rate * 100),
    note: quote.note ?? "",
    repName: quote.rep_name ?? "",
    repTitle: quote.rep_title ?? "",
  };
}

/**
 * "Đã thay thế" — a higher version exists for the same project. Standalone
 * quotes have no siblings, so they never supersede. (The list rows carry
 * `is_latest` from the server; a single-quote read has to ask.)
 */
export async function isSuperseded(quote: Quote): Promise<boolean> {
  if (!quote.project_id) return false;
  const versions = await getProjectQuotes(quote.project_id);
  return versions.some((v) => v?.version > quote.version);
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
