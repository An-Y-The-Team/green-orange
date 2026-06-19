// Báo giá / Quyết toán — initial quote vs final settlement. Same shape, the
// `type` discriminates: a quyết toán is just a quote reconciling actual costs.
import type { QuoteStatus, QuoteType } from "./enums";

export interface QuoteItem {
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
}

export interface Quote {
  id: number;
  code: string;
  project_code: string;
  customer: string;
  title: string;
  type: QuoteType;
  issue_date: string;
  valid_until: string;
  status: QuoteStatus;
  items: QuoteItem[];
  vat_rate: number; // e.g. 0.08 for 8% VAT
  notes: string;
}
