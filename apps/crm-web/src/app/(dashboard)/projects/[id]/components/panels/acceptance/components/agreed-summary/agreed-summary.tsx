"use client";

import { Button } from "@yan/ui/components/button";

import {
  AcceptanceNoteTag,
  AcceptanceSubStatus,
} from "../../../../../../enums";
import { useAcceptanceAction } from "../../hooks/use-acceptance-action/use-acceptance-action";

/** Bước 2's summary while signing, with the way back to inspecting. */
export function AgreedSummary({
  projectId,
  text,
}: {
  projectId: number;
  text: string;
}) {
  const { run, pending } = useAcceptanceAction({ projectId });

  // Client changed their mind before signing: reopen the inspection.
  const handleUndo = () =>
    run({
      patch: { acceptance_sub_status: AcceptanceSubStatus.INSPECTING },
      note: {
        tag: AcceptanceNoteTag.UNDO_AGREED,
        body: "Quay lại Thực hiện Nghiệm thu",
      },
    });

  return (
    <>
      {text}{" "}
      <Button variant="ghost" size="sm" disabled={pending} onClick={handleUndo}>
        Quay lại
      </Button>
    </>
  );
}
