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

import { mintRecoveryLink } from "../recovery";
import { type UserFormValues, userSchema } from "../schema";
import type { AkUser, UserActionResult } from "../types";

/**
 * New account, no password: the person sets their own through the recovery
 * link this returns. The link rides back in `data` only — never in a URL or a
 * log — and the form renders it once for the admin to copy.
 */
export async function createUser(
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

  let user: AkUser;
  try {
    await requireUserAdmin();
    user = await akFetch<AkUser>("/core/users/", {
      method: "POST",
      body: JSON.stringify({
        ...parsed.data,
        email: parsed.data.email ?? "",
        type: "internal",
      }),
    });
    revalidatePath("/settings/users");
  } catch (error) {
    return {
      success: false,
      message: userActionError(error, ACTION_MESSAGES.createFailed(NOUNS.user)),
    };
  }

  const noun = `${NOUNS.user} "${user.username}"`;
  // The account exists at this point, so a failed link is not a failed create:
  // report it as created and let Đặt lại mật khẩu on the user page mint one.
  try {
    const link = await mintRecoveryLink(user.pk);
    return {
      success: true,
      message: ACTION_MESSAGES.created(noun),
      data: { user, link },
    };
  } catch {
    return {
      success: true,
      message: `${ACTION_MESSAGES.created(noun)} Chưa tạo được liên kết đặt mật khẩu — dùng "Đặt lại mật khẩu" trên trang người dùng.`,
      data: { user, link: null },
    };
  }
}
