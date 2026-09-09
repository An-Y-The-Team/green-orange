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
  /** Non-null ⟺ đơn bù công — the times were claimed, not stamped. */
  remedy_reason: string | null;
  /** "over_cap" — clocked out past the 16-hour cap, so the hours were clamped. */
  flag: string | null;
  project: ProjectRef;
}

/** The shift in progress, from GET /worker/shift. */
export interface OpenShift {
  id: number;
  project: ProjectRef;
  work_date: string;
  start_time: string | null;
  /** Started on an earlier business day — they forgot to chấm công ra. */
  stale: boolean;
}

/**
 * GET /worker/shift always answers with this envelope, never a bare `null` —
 * an empty 200 body would make the response's `json()` throw.
 */
export interface ShiftResponse {
  shift: OpenShift | null;
}

/** Opens đơn bù công with the day and công trình of a rejected row filled in. */
export interface RemedyPrefill {
  projectId: number;
  workDate: string;
}
