import { TimekeepingSource } from "@/app/(dashboard)/crew/enums";
import type { TimekeepingRecord } from "@/app/(dashboard)/crew/types";

// Chấm công — v2, all on project 2 (CT-2026-002, đang thi công). Manual is
// source of truth; the zalo_app row coexists for the same day (future
// mini-app feed) and stays read-only in the UI.
export const timekeeping: TimekeepingRecord[] = [
  {
    id: 1,
    crew_member_id: 1,
    project_id: 2,
    work_date: "2026-07-15",
    hours: 8,
    source: TimekeepingSource.MANUAL,
  },
  {
    id: 2,
    crew_member_id: 2,
    project_id: 2,
    work_date: "2026-07-15",
    hours: 8,
    source: TimekeepingSource.MANUAL,
  },
  {
    id: 3,
    crew_member_id: 2,
    project_id: 2,
    work_date: "2026-07-16",
    hours: 6.5,
    source: TimekeepingSource.MANUAL,
    note: "Về sớm — chờ vật tư.",
  },
  {
    id: 4,
    crew_member_id: 2,
    project_id: 2,
    work_date: "2026-07-16",
    hours: 7,
    source: TimekeepingSource.ZALO_APP,
  },
];
