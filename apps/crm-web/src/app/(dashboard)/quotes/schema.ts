// Zod shapes for stage-3 báo giá mutations + the builder form. Mirrors the
// Nest contract (POST/PATCH /quotes): money math is server-authoritative, the
// client only sends description/unit/quantity/unit_price + a VAT fraction.
import { z } from "zod";

const quoteItemSchema = z.object({
  description: z.string().min(1, "Nhập hạng mục"),
  unit: z.string().optional(),
  quantity: z.number().min(0),
  unit_price: z.number().min(0),
});

export const createQuoteSchema = z.object({
  // Optional: standalone quotes have no project (attach one to tie it into the
  // pipeline — the backend auto-advances that project to Báo giá).
  project_id: z.number().int().positive().optional(),
  items: z.array(quoteItemSchema).min(1, "Cần ít nhất một dòng"),
  vat_rate: z.number().min(0).max(1),
  note: z.string().optional(),
});
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;

// Draft-only PATCH — all optional; unknown keys (e.g. project_id) are stripped,
// so the builder can send one create-shaped payload to either action.
export const updateQuoteSchema = z.object({
  items: z.array(quoteItemSchema).min(1).optional(),
  vat_rate: z.number().min(0).max(1).optional(),
  note: z.string().optional(),
});

export const sendQuoteSchema = z.object({
  channels: z.array(z.enum(["zalo", "email", "print"])).min(1, "Chọn kênh gửi"),
  sent_by: z.string().min(1, "Nhập người gửi"),
  follow_up_ref: z.string().optional(),
});

export const decideQuoteSchema = z.object({
  status: z.enum(["deal", "on_hold", "rejected"]),
  projectId: z.number().int().positive(),
  version: z.number().int().positive(),
  follow_up_date: z.string().optional(),
  cancel_reason: z.string().optional(),
});

// Builder form values — VAT held as a percent (0..100) for the input; converted
// to a fraction on submit. Totals shown client-side, recomputed server-side.
export const quoteFormSchema = z.object({
  items: z.array(quoteItemSchema).min(1, "Cần ít nhất một dòng"),
  vat_percent: z.number().min(0).max(100),
  note: z.string().optional(),
});
export type QuoteFormValues = z.infer<typeof quoteFormSchema>;
