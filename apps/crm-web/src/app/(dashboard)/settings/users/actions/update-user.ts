"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import {
  ACTION_MESSAGES,
  INVALID_INPUT_MESSAGE,
  NOUNS,
} from "@/constants/server-action";
import {
  akFetch,
  requireUserAdmin,
  userActionError,
} from "@/utils/authentik-admin/authentik-admin";

import { type UserFormValues, userSchema } from "../schema";
import type { AkUser, UserActionResult } from "../types";

export async function updateUser(
  pk: number,
  _prev: ServerActionState<UserActionResult>,
  input: UserFormValues
): Promise<ServerActionState<UserActionResult>> {
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: INVALID_INPUT_MESSAGE,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await requireUserAdmin();
    const user = await akFetch<AkUser>(`/core/users/${pk}/`, {
      method: "PATCH",
      body: JSON.stringify({ ...parsed.data, email: parsed.data.email ?? "" }),
    });
    revalidatePath("/settings/users");
    revalidatePath(`/settings/users/${pk}`);
    return {
      success: true,
      message: ACTION_MESSAGES.updated(NOUNS.user),
      data: { user, link: null },
    };
  } catch (error) {
    return {
      success: false,
      message: userActionError(error, ACTION_MESSAGES.updateFailed(NOUNS.user)),
    };
  }
}
