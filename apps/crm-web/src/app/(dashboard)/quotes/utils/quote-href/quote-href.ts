import type { Quote } from "../../types";

/**
 * The one address of a báo giá. A quote that belongs to a công trình lives
 * inside it (`/projects/{pid}/quotes/{id}`) so opening, printing and going back
 * never leave the job; a standalone quote keeps `/quotes/{id}`. The old
 * `/quotes/{id}` route redirects a project quote here, so this is the only
 * place the URL is spelled out.
 */
export function quoteHref(quote: Pick<Quote, "id" | "project_id">): string {
  return quote.project_id
    ? `/projects/${quote.project_id}/quotes/${quote.id}`
    : `/quotes/${quote.id}`;
}

/** The customer-facing sheet of the same quote. */
export function quotePrintHref(
  quote: Pick<Quote, "id" | "project_id">
): string {
  return `${quoteHref(quote)}/print`;
}
