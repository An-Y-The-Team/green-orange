// Báo giá — v2. Bargaining = a new version row; sent versions are frozen and
// the latest version carries the live status ("superseded" is derived, never
// stored). Serialized by crm-api-nest: money as numbers, *_date = YYYY-MM-DD,
// *_at = full ISO.
import type { QuoteChannel, QuoteStatus } from "./enums";

export interface QuoteItem {
  description: string;
  unit?: string | null; // m², buổi, … (free text)
  quantity: number;
  unit_price: number; // VND
  amount: number; // VND — server-computed round(quantity × unit_price)
  sort_order: number;
}

export interface QuoteSendLog {
  id: number;
  quote_id: number;
  channel: QuoteChannel;
  sent_by: string;
  sent_at: string; // full ISO
  follow_up_ref?: string | null;
}

export interface Quote {
  id: number;
  project_id: number | null; // null = standalone (walk-in / speculative)
  version: number;
  status: QuoteStatus;
  total_amount: number; // VND, before VAT (Σ item amounts)
  vat_rate: number; // e.g. 0.08
  decided_date?: string | null; // YYYY-MM-DD
  note?: string | null; // terms block on the printable
  items: QuoteItem[];
  send_logs: QuoteSendLog[];
}
