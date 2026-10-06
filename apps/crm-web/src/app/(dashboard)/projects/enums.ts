// Công Trình — closed value sets, 1:1 with the v2 backend contract
// (docs/features/crm-database-schema.md). English values; Vietnamese labels
// live only in src/constants/labels.ts. Project types are a user-managed tag
// entity in v2, not an enum.

// The 8 lifecycle stages, in order. The workspace stepper renders these.
// Yêu cầu + Khảo sát are ONE stage (the appointment is the survey visit);
// `visit_date` marks where inside it a project sits.
export enum ProjectStage {
  REQUEST = "request", // 1. Yêu cầu & Khảo sát
  QUOTE = "quote", // 2. Báo giá
  CONTRACT = "contract", // 3. Hợp đồng
  PAPERWORK = "paperwork", // 4. Chuẩn bị hồ sơ
  EXECUTION = "execution", // 5. Thi công
  ACCEPTANCE = "acceptance", // 6. Nghiệm thu
  SETTLEMENT = "settlement", // 7. Quyết toán & Thanh toán
  CLOSED = "closed", // 8. Đã đóng
}

// Orthogonal to stage — the stage freezes where a project died/parked.
export enum ProjectStatus {
  ACTIVE = "active",
  ON_HOLD = "on_hold", // requires follow_up_date
  CANCELLED = "cancelled", // requires cancel_reason, terminal
}

// Stage-5 sub-status, forward-only; hoarding is skippable.
export enum ExecutionSubStatus {
  KICKOFF = "kickoff", // Khởi công
  HOARDING = "hoarding", // Dựng rào
  WORKS = "works", // Thi công
}

// Stage-6 sub-status with the rework loop (inspecting ⇄ rework).
export enum AcceptanceSubStatus {
  REQUEST_SENT = "request_sent", // Gửi yêu cầu
  INSPECTING = "inspecting", // Nghiệm thu
  REWORK = "rework", // Bổ sung
  PASSED = "passed", // Đạt
}

// Stage-4 checklist items; overdue is DERIVED (due_date passed, not approved).
export enum PaperworkStatus {
  PREPARING = "preparing", // Chưa xong
  SUBMITTED = "submitted", // Đã nộp
  APPROVED = "approved", // Đã duyệt
}

// The workspace's non-stage views (`?view=` on /projects/[id]). A stage view is
// just its ProjectStage value; these two sit under the stage list in the nav.
export enum WorkspacePane {
  DOCUMENTS = "documents",
  CREW = "crew",
}

// One row of a stage's "Việc cần làm" checklist (utils/stage-gates). The same
// key can appear in two stages (the cọc is asked for in Hợp đồng and again in
// Hồ sơ); the action that satisfies it is the same either way.
export enum GateKey {
  APPOINTMENT = "appointment",
  VISIT = "visit",
  SURVEY_DATA = "survey_data",
  QUOTE_FROM_SURVEY = "quote_from_survey",
  QUOTE_EXISTS = "quote_exists",
  QUOTE_SENT = "quote_sent",
  QUOTE_DEAL = "quote_deal",
  CLIENT_SIGNED = "client_signed",
  DEPOSIT = "deposit",
  PAPERWORK_APPROVED = "paperwork_approved",
  START_DATE = "start_date",
  WORKS_DONE = "works_done",
  ACCEPTANCE_PASSED = "acceptance_passed",
  SETTLEMENT_EXISTS = "settlement_exists",
  SETTLEMENT_SIGNED = "settlement_signed",
  BILL_OFFICIAL = "bill_official",
  MILESTONES_PAID = "milestones_paid",
}

// The stage that needs a hồ sơ item approved. Only EXECUTION items gate the
// auto-advance to Thi công; the later-stage documents seeded up front (đề nghị
// thanh toán, biên bản nghiệm thu / quyết toán) wait for their own stage.
export enum PaperworkNeededFor {
  EXECUTION = "execution",
  ACCEPTANCE = "acceptance",
  SETTLEMENT = "settlement",
}

// Stage-5 numeric duration columns a PATCH can target. The VALUES are real
// `projects` column names (see types.ts / update-project.ts) — renaming a column
// means editing them here too, which is the point: one place, not two call sites.
export enum DurationField {
  ESTIMATED = "est_duration_days",
  ACTUAL = "actual_duration_days",
}
