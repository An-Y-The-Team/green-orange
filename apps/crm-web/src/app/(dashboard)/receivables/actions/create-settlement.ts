"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { bills } from "@/data/mock/bills";
import { settlements } from "@/data/mock/settlements";
import { API_URL, apiSend, nextId } from "@/lib/http";

import { BillStatus, SettlementStatus } from "../enums";
import { type CreateSettlementInput, createSettlementSchema } from "../schema";
import type { Settlement } from "../types";

/**
 * Create a draft settlement (Quyết toán). The server computes each item
 * `amount` + `total_amount` AND auto-creates a paired draft Bill in the same
 * transaction. Mock mode synthesises both so the builder flow is demoable.
 */
export async function createSettlement(
  _prev: ServerActionState,
  input: CreateSettlementInput
): Promise<ServerActionState> {
  const parsed = createSettlementSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    let settlement: Settlement;
    if (API_URL) {
      settlement = await apiSend<Settlement>(
        "/settlements",
        "POST",
        parsed.data
      );
    } else {
      const { project_id, note, items } = parsed.data;
      const id = nextId(settlements);
      const priced = items.map((it, i) => ({
        id: i + 1,
        settlement_id: id,
        description: it.description,
        unit: it.unit ?? null,
        quantity: it.quantity,
        unit_price: it.unit_price,
        amount: Math.round(it.quantity * it.unit_price),
        sort_order: it.sort_order ?? i,
      }));
      const total = priced.reduce((s, it) => s + it.amount, 0);
      settlement = {
        id,
        project_id,
        status: SettlementStatus.DRAFT,
        total_amount: total,
        signed_date: null,
        note: note ?? null,
        items: priced,
        bill: {
          id: nextId(bills),
          project_id,
          settlement_id: id,
          status: BillStatus.DRAFT,
          total_amount: 0,
          sent_date: null,
          paid_date: null,
        },
      };
    }

    revalidatePath(`/projects/${settlement.project_id}`);
    revalidatePath("/receivables");

    return {
      success: true,
      message: "Đã lưu quyết toán nháp.",
      data: settlement,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể lưu quyết toán.",
    };
  }
}
