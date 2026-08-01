"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import {
  ACTION_MESSAGES,
  INVALID_INPUT_MESSAGE,
  NOUNS,
} from "@/constants/server-action";
import { apiSend } from "@/utils/http/http";

import { type UpdateCompanyFormValues, updateCompanySchema } from "../schema";

/** Save the company profile (letterhead + Bên B details on every document). */
export async function updateCompany(
  _prev: ServerActionState,
  input: UpdateCompanyFormValues
): Promise<ServerActionState> {
  const parsed = updateCompanySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: INVALID_INPUT_MESSAGE,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const profile = await apiSend("/company-profile", "PATCH", parsed.data);
    // The profile prints on every document — refresh the whole dashboard tree.
    revalidatePath("/", "layout");
    return {
      success: true,
      message: ACTION_MESSAGES.saved(NOUNS.company),
      data: profile,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : ACTION_MESSAGES.saveFailed(NOUNS.company),
    };
  }
}
