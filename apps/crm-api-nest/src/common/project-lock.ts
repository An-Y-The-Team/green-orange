import { ConflictException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

// Closed projects are locked (crm-ui-redesign.md, stage 9): mutations on the
// project and its entities are rejected. Exempt: ProjectNote, and the reopen
// transition (stage closed → settlement) handled in the projects module.
export async function assertProjectOpen(
  prisma: PrismaService,
  projectId: number | null | undefined
): Promise<void> {
  if (projectId == null) return; // standalone quote/contract — nothing to lock
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { stage: true },
  });
  if (project?.stage === "closed")
    throw new ConflictException(
      "project is closed — reopen it (stage: settlement) before editing"
    );
}
