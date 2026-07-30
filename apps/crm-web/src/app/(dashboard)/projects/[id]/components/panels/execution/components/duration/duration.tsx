import { getProjectTimekeepingSummary } from "@/app/(dashboard)/crew/queries";
import type { TimekeepingRecord } from "@/app/(dashboard)/crew/types";

import type { Project } from "../../../../../../types";
import { DurationForm } from "./components/duration-form/duration-form";

/**
 * Duration block of the thi công panel. Server half: the chấm công figures come
 * from GET /timekeeping/summary, an exact SUM(hours) / COUNT(DISTINCT work_date)
 * over the whole công trình with manual winning over zalo_app per member+day.
 *
 * They used to be reduced from the `timekeeping` rows, which are ONE page of
 * GET /timekeeping — the fastest-growing table in the schema — so a big project
 * could only be shown a lower bound ("≥ X giờ"). The rows are still passed down
 * for the per-day breakdown dialog, which is a listing and pages honestly.
 */
export async function Duration({
  project,
  timekeeping,
}: {
  project: Project;
  timekeeping: TimekeepingRecord[];
}) {
  const summary = await getProjectTimekeepingSummary(project.id);

  return (
    <DurationForm
      project={project}
      timekeeping={timekeeping}
      totalHours={summary?.total_hours ?? 0}
      recordedDays={summary?.recorded_days ?? 0}
    />
  );
}
