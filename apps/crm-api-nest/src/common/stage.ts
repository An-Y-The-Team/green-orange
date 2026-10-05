import { PrismaService } from "../prisma/prisma.service";
import { businessToday } from "./business-date";

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

// Stage-4 exit (crm-ui-redesign.md: "all items approved + stage-3 gates"): every
// hồ sơ item needed for Thi công is approved AND the cọc is in. Items tagged for
// a later stage (needed_for acceptance/settlement) don't count, and an empty
// checklist proves nothing — at least one execution item must exist.
export function paperworkReady(
  items: { status: string; needed_for: string }[],
  depositPaid: boolean
): boolean {
  const needed = items.filter((i) => i.needed_for === "execution");
  return (
    depositPaid &&
    needed.length > 0 &&
    needed.every((i) => i.status === "approved")
  );
}

// Stage-7 exit: the signed settlement's money is all in — its bill is marked
// paid, or every đợt on that bill is.
export function fullyPaid(
  settlementStatus: string | null | undefined,
  billStatus: string | null | undefined,
  milestones: { status: string }[]
): boolean {
  if (settlementStatus !== "signed") return false;
  if (billStatus === "paid") return true;
  return milestones.length > 0 && milestones.every((m) => m.status === "paid");
}

// Called after anything that can complete the stage-4 checklist: a hồ sơ item
// approved/retagged/deleted, or the cọc recorded.
export async function advanceIfPaperworkReady(
  prisma: PrismaService,
  projectId: number
): Promise<void> {
  const [items, deposit] = await Promise.all([
    prisma.paperworkItem.findMany({
      where: { project_id: projectId },
      select: { status: true, needed_for: true },
    }),
    prisma.paymentMilestone.findFirst({
      where: { project_id: projectId, type: "deposit", status: "paid" },
      select: { id: true },
    }),
  ]);
  if (paperworkReady(items, deposit !== null))
    await advanceStage(prisma, projectId, "execution");
}

// Called after a đợt is paid, a bill is marked paid, or the settlement is
// signed. Closing locks the project, so the bill is flipped to paid in the same
// step — otherwise it would sit at "sent" forever with no way to edit it.
export async function closeIfFullyPaid(
  prisma: PrismaService,
  projectId: number
): Promise<void> {
  const settlement = await prisma.settlement.findUnique({
    where: { project_id: projectId },
    select: {
      status: true,
      bill: {
        select: {
          id: true,
          status: true,
          milestones: { select: { status: true } },
        },
      },
    },
  });
  const bill = settlement?.bill;
  if (!fullyPaid(settlement?.status, bill?.status, bill?.milestones ?? []))
    return;
  if (bill && bill.status !== "paid")
    await prisma.bill.update({
      where: { id: bill.id },
      data: { status: "paid", paid_date: businessToday() },
    });
  await advanceStage(prisma, projectId, "closed");
}
