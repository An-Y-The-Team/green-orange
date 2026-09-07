"use server";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { type AddNoteFormValues, addNote } from "./add-note";
import { type UpdateProjectFormValues, updateProject } from "./update-project";

/**
 * A status change and its note, committed as one user-visible step.
 *
 * The two call sites used to chain these by hand — one action firing the other
 * from its `onSuccess`, with the first one's toast `silent: true`. Two ways
 * that lost data:
 *
 * - **Acceptance rework**: note (required — what the client found) then status.
 *   If the status call failed, the note was already saved and the toast said
 *   only "couldn't update", so the operator retried and wrote it twice.
 * - **Execution stepper**: status then the optional note. If the *note* failed
 *   it failed **silently** — the status moved, the note vanished, no toast.
 *
 * There is no transaction to be had here: the note and the project are two API
 * endpoints (`POST /project-notes`, `PATCH /projects/:id`) and giving them one
 * is backend work. So this does the honest second-best — runs them in a defined
 * order and reports exactly which half committed, in one toast.
 *
 * `noteFirst` follows which half is load-bearing: the note, when it is the
 * reason for the change; the status, when the note is an optional comment.
 */
export async function updateProjectWithNote(
  projectId: number,
  _prev: ServerActionState,
  input: {
    patch: UpdateProjectFormValues;
    note?: AddNoteFormValues;
    noteFirst?: boolean;
  }
): Promise<ServerActionState> {
  const { patch, note, noteFirst } = input;
  const empty: ServerActionState = {
    success: false,
    message: null,
    errors: {},
  };

  const runNote = () => (note ? addNote(projectId, empty, note) : null);
  const runPatch = () => updateProject(projectId, empty, patch);

  if (noteFirst) {
    const noteResult = runNote();
    const noted = noteResult ? await noteResult : null;
    if (noted && !noted.success) return noted;

    const patched = await runPatch();
    if (patched.success || !noted) return patched;
    return {
      ...patched,
      message: `Đã lưu ghi chú, nhưng chưa đổi được trạng thái: ${patched.message}`,
    };
  }

  const patched = await runPatch();
  if (!patched.success || !note) return patched;

  const noted = await addNote(projectId, empty, note);
  if (noted.success) return patched;
  return {
    success: false,
    message: `Đã đổi trạng thái, nhưng chưa lưu được ghi chú: ${noted.message}`,
    errors: noted.errors,
  };
}
