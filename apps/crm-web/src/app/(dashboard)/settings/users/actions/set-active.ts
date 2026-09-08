"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { ACTION_MESSAGES, NOUNS } from "@/constants/server-action";
import {
  akFetch,
  requireUserAdmin,
  sessionUsername,
  userActionError,
} from "@/utils/authentik-admin/authentik-admin";

import { getUser } from "../queries";

// Not exported: a "use server" module may only export async functions.
const SELF_LOCK_MESSAGE = "Không thể khóa tài khoản đang đăng nhập.";

/**
 * Lock / unlock. Authentik stops issuing AND refreshing tokens for an inactive
 * user, so a locked account drops out of the CRM within one token lifetime.
 * Never a delete: the account (and its event history) stays.
 */
export async function setUserActive(
  pk: number,
  active: boolean,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    await requireUserAdmin();
    // Locking yourself would strand the session mid-request — and, with only
    // one admin, the whole page. The button is hidden for self; this is the
    // check that holds when the action is called directly.
    if (!active) {
      const target = await getUser(pk);
      if (target && target.username === (await sessionUsername())) {
        return { success: false, message: SELF_LOCK_MESSAGE };
      }
    }
    await akFetch(`/core/users/${pk}/`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: active }),
    });
    revalidatePath("/settings/users");
    revalidatePath(`/settings/users/${pk}`);
    return {
      success: true,
      message: active ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.",
    };
  } catch (error) {
    return {
      success: false,
      message: userActionError(error, ACTION_MESSAGES.updateFailed(NOUNS.user)),
    };
  }
}
