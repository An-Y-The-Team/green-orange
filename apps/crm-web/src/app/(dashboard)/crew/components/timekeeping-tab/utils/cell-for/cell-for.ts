import { TimekeepingSource } from "@/app/(dashboard)/crew/enums";
import type { TimekeepingRecord } from "@/app/(dashboard)/crew/types";

/**
 * The two rows that can occupy one grid cell. Manual and zalo_app coexist for a
 * member+day (the composite key includes `source`), and the cell shows manual
 * when there is one — it never sums, matching the backend's timekeepingSummary.
 */
export const cellFor = ({
  records,
  memberId,
  date,
}: {
  records: TimekeepingRecord[];
  memberId: number;
  date: string;
}): { manual?: TimekeepingRecord; zalo?: TimekeepingRecord } => {
  const cell = records.filter(
    (r) => r.crew_member_id === memberId && r.work_date === date
  );
  return {
    manual: cell.find((r) => r.source === TimekeepingSource.MANUAL),
    zalo: cell.find((r) => r.source === TimekeepingSource.ZALO_APP),
  };
};
