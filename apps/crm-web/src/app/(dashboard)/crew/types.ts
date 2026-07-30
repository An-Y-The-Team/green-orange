// Nhân sự — v2 contract shapes, mirrored from crm-api-nest src/crew/crew.module.ts.
// snake_case; *_date = 'YYYY-MM-DD'; *_at = full ISO; hours arrive as numbers.
import type {
  CrewMemberStatus,
  EmploymentType,
  TimekeepingSource,
} from "./enums";

/** Vai trò — user-managed name list (DB rows, not an enum). */
export interface CrewRole {
  id: number;
  name: string;
}

/** Lightweight project ref the API embeds on assignment includes. */
export interface ProjectRef {
  id: number;
  code: string;
  name: string;
}

export interface CrewMember {
  id: number;
  name: string;
  phone?: string | null; // Zalo number — future mini-app identity
  employment_type: EmploymentType;
  default_role_id?: number | null;
  status: CrewMemberStatus;
  note?: string | null;
  created_at: string; // full ISO
  default_role?: CrewRole | null; // include on GET /crew and /crew/:id
  assignments?: Assignment[]; // include on GET /crew/:id (with project ref)
}

export interface Assignment {
  id: number;
  project_id: number;
  crew_member_id: number;
  role_id?: number | null; // overrides the member's default role
  from_date: string;
  to_date?: string | null; // null = open-ended
  crew_member?: CrewMember; // include on GET /assignments
  role?: CrewRole | null; // include on GET /assignments
  project?: ProjectRef; // include on GET /crew/:id assignments
  /**
   * Same-member assignments whose date range intersects this one, each with
   * its project ref — computed by the API on create/update. Feeds the
   * non-blocking "Trùng lịch" warning only; double-booking is allowed.
   */
  overlaps?: Assignment[];
}

export interface TimekeepingRecord {
  id: number;
  crew_member_id: number;
  project_id: number;
  work_date: string;
  hours: number;
  source: TimekeepingSource; // manual is source of truth
  note?: string | null;
}
