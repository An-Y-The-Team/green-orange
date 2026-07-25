// Công Trình — closed value sets, 1:1 with the v2 backend contract
// (docs/features/crm-database-schema.md). English values; Vietnamese labels
// live only in src/lib/labels.ts. Project types are a user-managed tag
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
