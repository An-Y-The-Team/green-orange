// Báo giá — v2 contract values (English); labels in src/lib/labels.ts.
// Bargaining = new version; sent versions are never edited; the latest
// version carries the live status. Quyết toán is its own entity now
// (receivables feature), no more quote `type`.

export enum QuoteStatus {
  DRAFT = "draft", // Nháp
  WAITING = "waiting", // Chờ duyệt
  DEAL = "deal", // Chốt — gates stage 4
  ON_HOLD = "on_hold", // Hoãn — project parks with it
  REJECTED = "rejected", // Hủy — project cancels with it
}

/**
 * The three statuses a waiting quote can be decided into. A union of
 * `QuoteStatus` members rather than its own enum, so the values stay defined
 * once and `Record<QuoteStatus, …>` label maps keep working.
 */
export type QuoteDecision =
  | QuoteStatus.DEAL
  | QuoteStatus.ON_HOLD
  | QuoteStatus.REJECTED;

/** Same three, as a runtime list — for zod and any exhaustive iteration. */
export const QUOTE_DECISIONS = [
  QuoteStatus.DEAL,
  QuoteStatus.ON_HOLD,
  QuoteStatus.REJECTED,
] as const;

/** Which button submitted the quote builder — save as draft, or save then send. */
export enum QuoteSubmitIntent {
  DRAFT = "draft",
  SEND = "send",
}

export enum QuoteChannel {
  ZALO = "zalo",
  EMAIL = "email",
  PRINT = "print",
}
