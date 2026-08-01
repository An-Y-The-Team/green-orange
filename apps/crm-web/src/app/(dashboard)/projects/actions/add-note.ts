"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import {
  ACTION_MESSAGES,
  INVALID_INPUT_MESSAGE,
  NOUNS,
} from "@/constants/server-action";
import { apiSend } from "@/utils/http/http";

import type { ProjectNote } from "../types";

const addNoteSchema = z.object({
  body: z.string().min(1),
  tag: z.string().optional(),
});

export type AddNoteFormValues = z.infer<typeof addNoteSchema>;

export async function addNote(
  projectId: number,
  _prev: ServerActionState,
  input: AddNoteFormValues
): Promise<ServerActionState> {
  const parsed = addNoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: INVALID_INPUT_MESSAGE,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const note = await apiSend<ProjectNote>("/project-notes", "POST", {
      project_id: projectId,
      ...parsed.data,
    });

    revalidatePath(`/projects/${projectId}`);

    return {
      success: true,
      message: ACTION_MESSAGES.added(NOUNS.note),
      data: note,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : ACTION_MESSAGES.addFailed(NOUNS.note),
    };
  }
}
