"use client";

import { UserPlus } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@yan/ui/components/dialog";

import { assignCrew } from "@/app/(dashboard)/crew/actions/assign-crew";
import type { CrewMember } from "@/app/(dashboard)/crew/types";
import { formatVND } from "@/lib/format";
import { crewRole } from "@/lib/labels";

const initialState: ServerActionState = {
  success: false,
  message: null,
  errors: {},
};

// Pick which crew members staff a công trình. Seeded with the currently
// assigned ids; submitting replaces the project's assignment set via assignCrew.
export function CrewAssignDialog({
  projectCode,
  crew,
  assignedIds,
}: {
  projectCode: string;
  crew: CrewMember[];
  assignedIds: number[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>(assignedIds);
  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState(assignCrew, initialState);

  const { resetActionProcessed } = useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: () => setOpen(false),
  });

  // Reset the selection to the current assignment each time the dialog opens, so
  // a cancelled edit doesn't leak into the next open.
  const handleOpenChange = (next: boolean) => {
    if (next) setSelected(assignedIds);
    setOpen(next);
  };

  // Toggle one crew member in/out of the pending selection.
  const handleToggle = (crewId: number) => {
    setSelected((prev) =>
      prev.includes(crewId)
        ? prev.filter((id) => id !== crewId)
        : [...prev, crewId]
    );
  };

  // Persist the chosen crew set for this project.
  const handleSave = () => {
    resetActionProcessed();
    startTransition(() =>
      formAction({ project_code: projectCode, crew_ids: selected })
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm">
            <UserPlus />
            Phân công
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Phân công đội thi công</DialogTitle>
          <DialogDescription>
            Chọn nhân sự tham gia công trình {projectCode}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-80 gap-1 overflow-y-auto">
          {crew.map((member) => (
            <label
              key={member.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted"
            >
              <input
                type="checkbox"
                className="size-4"
                checked={selected.includes(member.id)}
                onChange={() => handleToggle(member.id)}
              />
              <span className="flex-1 text-sm">{member.name}</span>
              <Badge variant="secondary">{crewRole[member.role]}</Badge>
              <span className="w-24 text-right text-xs text-muted-foreground">
                {formatVND(member.day_rate)}
              </span>
            </label>
          ))}
        </div>
        <DialogFooter className="mt-2">
          <DialogClose render={<Button variant="outline" type="button" />}>
            Hủy
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? "Đang lưu..." : `Lưu (${selected.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
