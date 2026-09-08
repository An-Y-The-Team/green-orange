"use client";

import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";

import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";

import { resetPassword } from "../../actions/reset-password";
import { RecoveryLinkField } from "../recovery-link-panel/recovery-link-panel";

/** "Đặt lại mật khẩu": mints a fresh link and shows it right here, once. */
export function ResetPassword({ pk, active }: { pk: number; active: boolean }) {
  const [link, setLink] = useState<string | null>(null);
  const [state, run] = useActionState(
    resetPassword.bind(null, pk),
    INITIAL_ACTION_STATE
  );
  const [pending, start] = useTransition();
  useServerAction(state, pending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: (data?: { link: string }) => setLink(data?.link ?? null),
  });

  return (
    <div className="space-y-2">
      <ConfirmAction
        trigger={
          <Button variant="outline" disabled={!active || pending}>
            Đặt lại mật khẩu
          </Button>
        }
        title="Tạo liên kết đặt mật khẩu mới?"
        consequence="Liên kết cũ (nếu có) hết hiệu lực. Mật khẩu hiện tại vẫn dùng được cho đến khi người dùng đặt mật khẩu mới qua liên kết này."
        confirmLabel="Tạo liên kết"
        onConfirm={() => start(() => run())}
        pending={pending}
      />
      {!active ? (
        <p className="text-xs text-muted-foreground">
          Mở khóa tài khoản trước khi đặt lại mật khẩu.
        </p>
      ) : null}
      {link ? (
        <>
          <RecoveryLinkField link={link} />
          <p className="text-xs text-muted-foreground">
            Gửi cho người dùng. Hiệu lực 1 ngày, dùng một lần.
          </p>
        </>
      ) : null}
    </div>
  );
}
