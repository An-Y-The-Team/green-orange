"use client";

import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { Textarea } from "@yan/ui/components/textarea";

import { ACTIONS } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { formatDate } from "@/utils/format-date/format-date";

import { addNote } from "../../../../../actions/add-note";
import type { Project } from "../../../../../types";

/**
 * Ghi chú & hoạt động — moved here from the old read-only tab row so notes sit
 * beside every stage instead of behind a tab. The save button is outline: it
 * isn't the stage's next step, and green is reserved for that one button
 * (crm-ui-redesign.md, "Buttons vs badges").
 */
export function Notes({ project }: { project: Project }) {
  const notes = project.notes ?? [];
  const [body, setBody] = useState("");
  const [state, formAction] = useActionState(
    addNote.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () => setBody(""),
  });

  // Save the trimmed note; the server action revalidates the page.
  const handleAdd = () =>
    startTransition(() => formAction({ body: body.trim() }));

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Textarea
          aria-label="Ghi chú mới"
          rows={2}
          placeholder="Thêm ghi chú…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending || !body.trim()}
            onClick={handleAdd}
          >
            {isPending ? ACTIONS.saving : "Thêm ghi chú"}
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có ghi chú.</p>
      ) : (
        <ul className="space-y-3">
          {[...notes]
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .map((note) => (
              <li key={note.id} className="border-l-2 pl-3 text-sm">
                <div className="text-xs text-muted-foreground">
                  {formatDate(note.created_at)}
                  {note.tag ? ` · ${note.tag}` : ""}
                </div>
                <div className="whitespace-pre-wrap break-words">
                  {note.body}
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
