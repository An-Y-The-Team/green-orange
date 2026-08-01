"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { ACTION_MESSAGES, NOUNS } from "@/constants/server-action";
import { apiSend } from "@/utils/http/http";

/** Delete a draft quote (409 from the backend if it isn't a draft). */
export async function deleteQuote(
  id: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    await apiSend<unknown>(`/quotes/${id}`, "DELETE");

    revalidatePath("/projects/[id]", "page");
    revalidatePath("/quotes");

    return {
      success: true,
      message: ACTION_MESSAGES.deleted(`${NOUNS.quote} nháp`),
      data: { id },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : ACTION_MESSAGES.deleteFailed(NOUNS.quote),
    };
  }
}
