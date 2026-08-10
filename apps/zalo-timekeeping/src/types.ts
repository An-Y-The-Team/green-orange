// Shapes mirrored from crm-api-nest src/worker/worker.module.ts (v2 contract):
// snake_case, *_date = 'YYYY-MM-DD', hours arrive as numbers.
import type { TimekeepingStatus } from "./constants/timekeeping-status";

export interface CrewMe {
  id: number;
  name: string;
  phone: string | null;
  status: string;
}

export interface ProjectRef {
  id: number;
  code: string;
  name: string;
}

export interface TimekeepingLog {
  id: number;
  crew_member_id: number;
  project_id: number;
  work_date: string;
  hours: number;
  status: TimekeepingStatus;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
  project: ProjectRef;
}
