import type { Prisma } from "@prisma/client";

import { nextCode } from "../common/code";
import { DEFAULT_PAPERWORK } from "../paperwork/paperwork.module";

/**
 * The project row, its CT code and the default paperwork checklist, in the
 * caller's transaction. Ids are trusted: POST /projects and POST
 * /projects/import check ownership before calling.
 */
export async function insertProject(
  tx: Prisma.TransactionClient,
  {
    type_ids,
    stage,
    ...data
  }: Omit<
    Prisma.ProjectUncheckedCreateInput,
    "code" | "stage" | "types" | "survey_items"
  > & {
    type_ids: number[];
    stage?: string;
    survey_items?: Prisma.InputJsonValue;
  }
) {
  const project = await tx.project.create({
    data: {
      ...data,
      code: await nextCode(tx.project, "CT"),
      stage: stage ?? "request",
      types: { connect: type_ids.map((id) => ({ id })) },
    },
    include: { client: true, location: true, types: true },
  });
  // Auto-seed the stage-5 default paperwork checklist.
  await tx.paperworkItem.createMany({
    data: DEFAULT_PAPERWORK.map((d) => ({ project_id: project.id, ...d })),
  });
  return project;
}
