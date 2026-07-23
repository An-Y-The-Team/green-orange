// Zod shapes for stage-8 quyết toán mutations + the settlement builder form.
// Mirrors the Nest contract (POST/PATCH /settlements): money math is server-
// authoritative — the client sends description/unit/quantity/unit_price only.
// Settlements have NO VAT (unlike quotes).
import { z } from "zod";

import { SettlementStatus } from "./enums";

export const settlementItemSchema = z.object({
  description: z.string().min(1, "Nhập hạng mục"),
  unit: z.string().optional(),
  quantity: z.number().min(0),
  unit_price: z.number().min(0),
  sort_order: z.number().int().optional(),
});

export const createSettlementSchema = z.object({
  project_id: z.number().int().positive(),
  items: z.array(settlementItemSchema).min(1, "Cần ít nhất một dòng"),
  note: z.string().optional(),
});
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;

// Draft-only PATCH — all optional; unknown keys (e.g. project_id) are stripped,
// so the builder can send one create-shaped payload to either action.
export const updateSettlementSchema = z
  .object({
    items: z.array(settlementItemSchema).min(1).optional(),
    note: z.string().optional(),
    signed_date: z.string().optional(),
    status: z.nativeEnum(SettlementStatus).optional(),
  })
  .strip();

// Builder form values — totals shown client-side, recomputed server-side.
export const settlementFormSchema = z.object({
  items: z.array(settlementItemSchema).min(1, "Cần ít nhất một dòng"),
  note: z.string().optional(),
});
export type SettlementFormValues = z.infer<typeof settlementFormSchema>;
