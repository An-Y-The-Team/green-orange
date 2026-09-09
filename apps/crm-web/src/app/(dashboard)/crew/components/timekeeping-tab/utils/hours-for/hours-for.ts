import { TimekeepingStatus } from "@/app/(dashboard)/crew/enums";
import type { TimekeepingRecord } from "@/app/(dashboard)/crew/types";

import { cellFor } from "../cell-for/cell-for";

/**
 * The hours one grid cell contributes to every total.
 *
 * A lone zalo row only counts once duyệt — an open shift (in progress), a
 * pending submission and a rejected one are all claims, not công. Mirrors the
 * server's summary rule, which groups on `status: approved`.
 */
export const hoursFor = ({
  records,
  memberId,
  date,
}: {
  records: TimekeepingRecord[];
  memberId: number;
  date: string;
}): number => {
  const { manual, zalo } = cellFor({ records, memberId, date });
  const zaloHours =
    zalo?.status === TimekeepingStatus.APPROVED ? zalo.hours : 0;
  return manual?.hours ?? zaloHours;
};
