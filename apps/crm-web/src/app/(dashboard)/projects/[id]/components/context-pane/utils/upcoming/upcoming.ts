import { MilestoneStatus } from "@/app/(dashboard)/receivables/enums";
import type { PaymentMilestone } from "@/app/(dashboard)/receivables/types";
import { MILESTONE_TYPES } from "@/constants/labels";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { localDateOf, localTimeOf } from "@/utils/today-iso/today-iso";

import { PaperworkStatus } from "../../../../../enums";
import type { PaperworkItem, Project } from "../../../../../types";

export interface UpcomingItem {
  /** YYYY-MM-DD (local). */
  date: string;
  label: string;
  overdue: boolean;
}

/**
 * The context pane's "Sắp tới": dated things the job is waiting on, soonest
 * first — the survey appointment until the visit happens, hồ sơ submitted and
 * waiting for approval, and unpaid đợt. A date before `today` is overdue.
 */
export function upcoming({
  project,
  paperworkItems,
  milestones,
  today,
}: {
  project: Pick<Project, "appointment_at" | "visit_date">;
  paperworkItems: PaperworkItem[];
  milestones: PaymentMilestone[];
  today: string;
}): UpcomingItem[] {
  const items: Omit<UpcomingItem, "overdue">[] = [];

  if (project.appointment_at && !project.visit_date)
    items.push({
      date: localDateOf(project.appointment_at),
      label: `Hẹn khảo sát ${localTimeOf(project.appointment_at)}`,
    });

  for (const p of paperworkItems)
    if (p.status === PaperworkStatus.SUBMITTED && p.due_date)
      items.push({ date: p.due_date, label: `${p.name} — chờ duyệt` });

  for (const m of milestones)
    if (m.status !== MilestoneStatus.PAID && m.due_date)
      items.push({
        date: m.due_date,
        label: `Thu ${MILESTONE_TYPES[m.type]} · ${formatVND(m.amount)}`,
      });

  return items
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((i) => ({ ...i, overdue: i.date < today }));
}
