"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import {
  ACTION_MESSAGES,
  INVALID_INPUT_MESSAGE,
  NOUNS,
} from "@/constants/server-action";
import { apiSend } from "@/utils/http/http";

import { type CreateSettlementInput, createSettlementSchema } from "../schema";
import type { Settlement } from "../types";

/**
 * Create a draft settlement (Quyết toán). The server computes each item
 * `amount` + `total_amount` AND auto-creates a paired draft Bill in the same
 * transaction. `Settlement.project_id` is unique, so a project that already has
 * one gets the backend's conflict surfaced here.
 */
export async function createSettlement(
  _prev: ServerActionState,
  input: CreateSettlementInput
): Promise<ServerActionState> {
  const parsed = createSettlementSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: INVALID_INPUT_MESSAGE,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const settlement = await apiSend<Settlement>(
      "/settlements",
      "POST",
      parsed.data
    );

    revalidatePath(`/projects/${settlement.project_id}`);
    revalidatePath("/receivables");

    return {
      success: true,
      message: ACTION_MESSAGES.saved(`${NOUNS.settlement} nháp`),
      data: settlement,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : ACTION_MESSAGES.saveFailed(NOUNS.settlement),
    };
  }
}
