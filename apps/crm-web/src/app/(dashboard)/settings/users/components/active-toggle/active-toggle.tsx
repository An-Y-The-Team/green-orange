"use client";

import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";

import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";

import { setUserActive } from "../../actions/set-active";

/** Lock (confirmed) / unlock. Rendered nowhere for your own account. */
export function ActiveToggle({
  pk,
  active,
  self,
}: {
  pk: number;
  active: boolean;
  self: boolean;
}) {
  const router = useRouter();
  const [state, run] = useActionState(
    setUserActive.bind(null, pk, !active),
    INITIAL_ACTION_STATE
  );
  const [pending, start] = useTransition();
  useServerAction(state, pending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () => router.refresh(),
  });

  if (self) return null;

  const toggle = () => start(() => run());

  return active ? (
    <ConfirmAction
      trigger={
        <Button variant="outline" disabled={pending}>
          Khóa tài khoản
        </Button>
      }
      title="Khóa tài khoản này?"
      consequence="Người này không đăng nhập được nữa và phiên hiện tại của họ sẽ hết hạn. Tài khoản và lịch sử vẫn được giữ; có thể mở khóa lại bất kỳ lúc nào."
      confirmLabel="Khóa"
      onConfirm={toggle}
      pending={pending}
    />
  ) : (
    <Button variant="outline" disabled={pending} onClick={toggle}>
      Mở khóa
    </Button>
  );
}
