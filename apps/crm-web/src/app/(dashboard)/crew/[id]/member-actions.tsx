"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";

import { deleteCrewMember, updateCrewMember } from "../actions/members";
import { CrewMemberStatus } from "../enums";

const initialState: ServerActionState = { success: false };

export function MemberActions({
  id,
  status,
}: {
  id: number;
  status: CrewMemberStatus;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [leaveState, leaveAction] = useActionState(
    updateCrewMember.bind(null, id),
    initialState
  );
  const [leavePending, startLeave] = useTransition();
  useServerAction(leaveState, leavePending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
  });

  const [deleteState, deleteAction] = useActionState(
    deleteCrewMember.bind(null, id),
    initialState
  );
  const [deletePending, startDelete] = useTransition();
  useServerAction(deleteState, deletePending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: () => router.push("/crew"),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        render={<Link href={`/crew/${id}/edit`} />}
      >
        <Pencil className="size-4" />
        Sửa
      </Button>
      {status !== CrewMemberStatus.LEFT ? (
        <Button
          variant="outline"
          size="sm"
          disabled={leavePending}
          onClick={() =>
            startLeave(() => leaveAction({ status: CrewMemberStatus.LEFT }))
          }
        >
          Nghỉ việc
        </Button>
      ) : null}
      <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(true)}>
        <Trash2 className="size-4" />
        Xóa
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa nhân sự?</DialogTitle>
            <DialogDescription>
              Chỉ xóa được nhân sự chưa từng được phân công hay chấm công. Nếu
              đã có dữ liệu, hãy dùng &quot;Nghỉ việc&quot; thay cho xóa.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={deletePending}
              onClick={() => startDelete(() => deleteAction())}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
