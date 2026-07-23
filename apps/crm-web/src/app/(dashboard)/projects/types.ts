/* -------------------------------------------------------------------------- *
 * Công Trình (Project) — the v2 GreenOrange lifecycle spine.
 * Mirrors crm-api-nest: prisma Project + ProjectsController includes.
 * Serialization: snake_case; `*_date` = 'YYYY-MM-DD'; `*_at` = full ISO;
 * money = numbers.
 * -------------------------------------------------------------------------- */
import type { Quote } from "@/app/(dashboard)/quotes/types";

import type {
  AcceptanceSubStatus,
  ExecutionSubStatus,
  PaperworkStatus,
  ProjectStage,
  ProjectStatus,
} from "./enums";

/** User-managed tag entity (GET /project-types), not an enum. */
export interface ProjectType {
  id: number;
  name: string;
}

/** Stage-2 measurement scratch rows (stored as Json; prefill quote items). */
export interface SurveyItem {
  name: string;
  quantity?: number;
  unit?: string;
  note?: string;
}

// Relation shapes as included by the controller (subset of fields we render).
export interface ProjectClient {
  id: number;
  name: string;
}

export interface ProjectLocation {
  id: number;
  client_id: number;
  name: string;
  address: string;
}

export interface ProjectContact {
  id: number;
  name: string;
  phone?: string | null;
}

export interface Project {
  id: number;
  code: string; // CT-…
  client_id: number;
  location_id: number;
  working_contact_id: number;
  decision_maker_contact_id: number;
  name: string;
  request_note?: string | null; // stage 1
  referral_source?: string | null; // stage 1, free text
  stage: ProjectStage;
  status: ProjectStatus;
  cancel_reason?: string | null; // required when cancelled
  follow_up_date?: string | null; // on_hold jobs resurface
  appointment_at?: string | null; // stage 1 (full ISO)
  visit_date?: string | null; // "Đã gặp khách" (1→2)
  survey_note?: string | null; // stage 2
  survey_items?: SurveyItem[] | null; // stage 2
  client_signed_date?: string | null; // stage-4 gate
  execution_sub_status?: ExecutionSubStatus | null; // stage 6
  start_date?: string | null;
  est_duration_days?: number | null;
  actual_duration_days?: number | null;
  approaches?: string | null;
  works_done_at?: string | null; // stage-6 exit (full ISO)
  acceptance_sub_status?: AcceptanceSubStatus | null; // stage 7
  acceptance_passed_date?: string | null; // stamped on passed
  created_at: string;
  updated_at: string;

  // Relations. GET /projects includes client, location, types; GET
  // /projects/:id also includes contacts, paperwork_items, notes (and quotes,
  // left untyped here — the quotes feature owns that shape).
  types: ProjectType[];
  client?: ProjectClient;
  location?: ProjectLocation;
  working_contact?: ProjectContact;
  decision_maker?: ProjectContact;
  paperwork_items?: PaperworkItem[];
  notes?: ProjectNote[];
  quotes?: Quote[]; // GET /projects/:id include; shape owned by the quotes feature
}

/** Stage-5 checklist item; overdue is DERIVED (isOverdue), never stored. */
export interface PaperworkItem {
  id: number;
  project_id: number;
  name: string; // user-facing Vietnamese
  status: PaperworkStatus;
  due_date?: string | null;
  note?: string | null;
}

export interface ProjectNote {
  id: number;
  project_id: number;
  tag?: string | null; // e.g. kickoff, hoarding, rework
  body: string;
  created_at: string;
}

/** S3 metadata row (storage TBD; shape stable). */
export interface Attachment {
  id: number;
  project_id: number;
  kind: string; // survey | site_log | finish_image | signed_contract | acceptance_report | settlement | paperwork | other
  paperwork_item_id?: number | null;
  s3_key: string;
  note?: string | null;
  created_at: string;
}
