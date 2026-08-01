"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { ACTION_MESSAGES, NOUNS } from "@/constants/server-action";
import { apiSend } from "@/utils/http/http";

/**
 * Delete a draft settlement (409 from the backend if not a draft). The paired
 * bill is deleted server-side in the same transaction.
 */
export async function deleteSettlement(
  id: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    await apiSend(`/settlements/${id}`, "DELETE");

    revalidatePath("/projects/[id]", "page");
    revalidatePath("/receivables");

    return {
      success: true,
      message: ACTION_MESSAGES.deleted(`${NOUNS.settlement} nháp`),
      data: { id },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : ACTION_MESSAGES.deleteFailed(NOUNS.settlement),
    };
  }
}
