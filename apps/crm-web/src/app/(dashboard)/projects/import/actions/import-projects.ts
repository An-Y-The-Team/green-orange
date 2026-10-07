"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";
import { batchProcess } from "@yan/shared/utils";

import {
  ACTION_MESSAGES,
  INVALID_INPUT_MESSAGE,
  NOUNS,
} from "@/constants/server-action";
import { apiSend, toActionError } from "@/utils/http/http";

import type { Project } from "../../types";
import { importRequestSchema } from "../schema";
import type { ImportResult } from "../types";

/**
 * POST /projects/import once per workbook. Each call is ONE transaction on the
 * server (client, site, project, quote, …), so a refused file leaves nothing
 * behind and never blocks the others — every file gets its own result.
 */
export async function importProjects(
  input: unknown
): Promise<ServerActionState<ImportResult[]>> {
  const parsed = importRequestSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: INVALID_INPUT_MESSAGE };

  const results: ImportResult[] = [];
  // One at a time (batch of 1): each import issues the next CT-YYYY-NNN inside
  // its transaction, and two in flight would race for the same number.
  await batchProcess(
    parsed.data,
    async ({ key, body }, index) => {
      try {
        const project = await apiSend<Project>(
          "/projects/import",
          "POST",
          body
        );
        results[index] = {
          key,
          ok: true,
          project: { id: project.id, code: project.code, name: project.name },
        };
      } catch (error) {
        results[index] = {
          key,
          ok: false,
          message: toActionError(
            error,
            ACTION_MESSAGES.createFailed(NOUNS.project)
          ),
        };
      }
    },
    1
  );

  revalidatePath("/projects");
  const created = results.filter((r) => r.ok).length;
  return {
    success: created > 0,
    message: `Đã tạo ${created}/${results.length} công trình.`,
    data: results,
  };
}
