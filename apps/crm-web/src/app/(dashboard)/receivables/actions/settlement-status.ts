"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { API_URL, apiSend } from "@/lib/http";

import { SettlementStatus } from "../enums";
import type { Settlement } from "../types";

const signSchema = z.object({ signed_date: z.string().optional() });
export type SignSettlementInput = z.infer<typeof signSchema>;

async function patchStatus(
  id: number,
  body: Record<string, unknown>,
  okMessage: string,
  errMessage: string
): Promise<ServerActionState> {
  try {
    let settlement: Settlement | { id: number };
    if (API_URL) {
      settlement = await apiSend<Settlement>(
        `/settlements/${id}`,
        "PATCH",
        body
      );
    } else {
      settlement = { id };
    }

    // Status hops don't carry the project id; revalidate every project page.
    revalidatePath("/projects/[id]", "page");
    revalidatePath("/receivables");

    return { success: true, message: okMessage, data: settlement };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : errMessage,
    };
  }
}

/** "Send" the settlement — there is no /send route; it's PATCH {status:sent}. */
export async function sendSettlement(
  id: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  return patchStatus(
    id,
    { status: SettlementStatus.SENT },
    "Đã đánh dấu đã gửi.",
    "Không thể gửi quyết toán."
  );
}

/**
 * Sign the settlement — PATCH {status:signed}. The server transaction
 * officializes the bill, attaches the unallocated deposit, and auto-creates
 * the balance milestone. The client just PATCHes and re-reads.
 */
export async function signSettlement(
  id: number,
  _prev: ServerActionState,
  input?: SignSettlementInput
): Promise<ServerActionState> {
  const parsed = signSchema.safeParse(input ?? {});
  return patchStatus(
    id,
    { status: SettlementStatus.SIGNED, signed_date: parsed.data?.signed_date },
    "Đã ký quyết toán.",
    "Không thể ký quyết toán."
  );
}
