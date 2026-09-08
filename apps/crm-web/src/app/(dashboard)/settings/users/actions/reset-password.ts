"use server";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import {
  requireUserAdmin,
  userActionError,
} from "@/utils/authentik-admin/authentik-admin";

import { getUser } from "../queries";
import { mintRecoveryLink } from "../recovery";

/**
 * A new one-day link for an existing account (forgotten password). Minting
 * one invalidates the previous link for that user. Refused for a locked
 * account: the link would "work" up to a sign-in that can never succeed.
 */
export async function resetPassword(
  pk: number,
  _prev: ServerActionState<{ link: string }>
): Promise<ServerActionState<{ link: string }>> {
  try {
    await requireUserAdmin();
    const user = await getUser(pk);
    if (!user) return { success: false, message: "Người dùng không tồn tại." };
    if (!user.is_active) {
      return {
        success: false,
        message: "Tài khoản đang bị khóa — mở khóa trước khi đặt lại mật khẩu.",
      };
    }
    const link = await mintRecoveryLink(pk);
    return {
      success: true,
      message: `Đã tạo liên kết đặt mật khẩu cho "${user.username}".`,
      data: { link },
    };
  } catch (error) {
    return {
      success: false,
      message: userActionError(error, "Không thể tạo liên kết đặt mật khẩu."),
    };
  }
}
