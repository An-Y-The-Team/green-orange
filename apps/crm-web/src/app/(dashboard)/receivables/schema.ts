// Zod shapes for stage-8 quyết toán mutations + the settlement builder form.
// Mirrors the Nest contract (POST/PATCH /settlements): money math is server-
// authoritative — the client sends description/unit/quantity/unit_price plus
// the giảm giá and VAT rate, and the server computes every total from them.
import { z } from "zod";

import { SettlementStatus } from "./enums";

export const settlementItemSchema = z.object({
  description: z.string().min(1, "Nhập hạng mục"),
  unit: z.string().optional(),
  quantity: z.number().min(0),
  // Whole đồng only — VND has no fractional unit and the column is BigInt, so a
  // decimal here was silently dropped server-side.
  unit_price: z.number().int().min(0),
  sort_order: z.number().int().optional(),
});

// Whole đồng, same reason as unit_price.
const discountAmount = z.number().int().min(0);
const vatRate = z.number().min(0).max(1);

export const createSettlementSchema = z.object({
  project_id: z.number().int().positive(),
  items: z.array(settlementItemSchema).min(1, "Cần ít nhất một dòng"),
  discount_amount: discountAmount.optional(),
  vat_rate: vatRate.optional(),
  note: z.string().optional(),
});
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;

// Draft-only PATCH — all optional; unknown keys (e.g. project_id) are stripped,
// so the builder can send one create-shaped payload to either action.
export const updateSettlementSchema = z
  .object({
    items: z.array(settlementItemSchema).min(1).optional(),
    discount_amount: discountAmount.optional(),
    vat_rate: vatRate.optional(),
    note: z.string().optional(),
    signed_date: z.string().optional(),
    status: z.nativeEnum(SettlementStatus).optional(),
  })
  .strip();

// Builder form values — totals shown client-side, recomputed server-side. VAT
// is entered as a percent (like the quote builder) and sent as a rate.
export const settlementFormSchema = z
  .object({
    items: z.array(settlementItemSchema).min(1, "Cần ít nhất một dòng"),
    discount_amount: discountAmount,
    vat_percent: z.number().min(0).max(100),
    note: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    // Mirrors the server's write-time guard (assertDiscountWithin): without
    // this the form saves and the API answers 400 with an English message.
    // Same per-line rounding as the server, so the boundary agrees exactly.
    const subtotal = val.items.reduce(
      (sum, it) => sum + Math.round((it.quantity ?? 0) * (it.unit_price ?? 0)),
      0
    );
    if (val.discount_amount > subtotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discount_amount"],
        message: "Giảm giá không được vượt quá tổng trước thuế.",
      });
    }
  });
export type SettlementFormValues = z.infer<typeof settlementFormSchema>;
