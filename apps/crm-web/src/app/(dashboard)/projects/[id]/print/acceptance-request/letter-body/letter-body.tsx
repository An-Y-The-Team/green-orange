"use client";

import { Pencil } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { Textarea } from "@yan/ui/components/textarea";

import { ACTIONS } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";

import { updateProject } from "../../../../actions/update-project";

/**
 * The editable middle of a stage-7 letter. Plain text, blank line = paragraph;
 * saved on the project so the same wording reprints. A blank save falls back to
 * the built-in text, which is how the operator "resets".
 *
 * Holds the saved body locally rather than relying on revalidation: updateProject
 * revalidates /projects/[id], not this print route.
 */
export function LetterBody({
  projectId,
  field,
  stored,
  fallback,
}: {
  projectId: number;
  field: "acceptance_letter_body" | "building_letter_body";
  stored: string | null | undefined;
  fallback: string;
}) {
  const [saved, setSaved] = useState(stored ?? "");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState(
    updateProject.bind(null, projectId),
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () => {
      setSaved(draft);
      setEditing(false);
    },
  });

  const body = saved.trim() ? saved : fallback;

  if (editing)
    return (
      <div className="space-y-2 print:hidden">
        <Textarea
          rows={12}
          value={draft}
          disabled={isPending}
          onChange={(e) => setDraft(e.target.value)}
        />
        <p className="text-xs text-zinc-500">
          Cách đoạn bằng một dòng trống. Xóa hết rồi lưu để về nội dung mặc
          định.
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(() => formAction({ [field]: draft }))
            }
          >
            {ACTIONS.save}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => setEditing(false)}
          >
            {ACTIONS.cancel}
          </Button>
        </div>
      </div>
    );

  return (
    <div className="space-y-2">
      <div className="whitespace-pre-line">{body}</div>
      <Button
        size="sm"
        variant="link"
        className="px-0 print:hidden"
        onClick={() => {
          setDraft(body);
          setEditing(true);
        }}
      >
        <Pencil className="size-3.5" />
        Sửa nội dung
      </Button>
    </div>
  );
}
