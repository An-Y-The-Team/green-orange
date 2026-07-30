import { PrismaService } from "../prisma/prisma.service";

// The 8 lifecycle stages, in order (prisma/schema.prisma Project.stage).
// 2026-07-25: "survey" merged into "request" — the appointment IS the survey
// visit, so it's one stage; `visit_date` marks where inside it we are.
export const STAGE_ORDER = [
  "request",
  "quote",
  "contract",
  "paperwork",
  "execution",
  "acceptance",
  "settlement",
  "closed",
];

// Forward-only decision (crm-ui-redesign.md, 2026-07-24): advance only when
// target is strictly ahead of current, and never out of a closed project.
export function shouldAdvance(current: string, target: string): boolean {
  if (current === "closed") return false;
  return STAGE_ORDER.indexOf(target) > STAGE_ORDER.indexOf(current);
}

// Auto-advance: doing the work bumps the project's stage forward
// (`stage = max(stage, target)`). Safe to call opportunistically after an
// artifact is created; a no-op when projectId is null (standalone quotes/
// contracts) or the project is already at/past the target.
export async function advanceStage(
  prisma: PrismaService,
  projectId: number | null | undefined,
  target: string
): Promise<void> {
  if (projectId == null) return;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { stage: true },
  });
  if (!project || !shouldAdvance(project.stage, target)) return;
  await prisma.project.update({
    where: { id: projectId },
    data: { stage: target },
  });
}
