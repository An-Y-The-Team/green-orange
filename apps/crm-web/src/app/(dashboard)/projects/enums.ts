// Công Trình — closed value sets, 1:1 with the v2 backend contract
// (docs/features/crm-database-schema.md). English values; Vietnamese labels
// live only in src/lib/labels.ts. Project types are a user-managed tag
// entity in v2, not an enum.

// The 9 lifecycle stages, in order. The workspace stepper renders these.
export enum ProjectStage {
  REQUEST = "request", // 1. Yêu cầu
  SURVEY = "survey", // 2. Khảo sát
  QUOTE = "quote", // 3. Báo giá
  CONTRACT = "contract", // 4. Hợp đồng
  PAPERWORK = "paperwork", // 5. Chuẩn bị hồ sơ
  EXECUTION = "execution", // 6. Thi công
  ACCEPTANCE = "acceptance", // 7. Nghiệm thu
  SETTLEMENT = "settlement", // 8. Quyết toán & Thanh toán
  CLOSED = "closed", // 9. Đã đóng
}

// Orthogonal to stage — the stage freezes where a project died/parked.
export enum ProjectStatus {
  ACTIVE = "active",
  ON_HOLD = "on_hold", // requires follow_up_date
  CANCELLED = "cancelled", // requires cancel_reason, terminal
}

// Stage-6 sub-status, forward-only; hoarding is skippable.
export enum ExecutionSubStatus {
  KICKOFF = "kickoff", // Khởi công
  HOARDING = "hoarding", // Dựng rào
  WORKS = "works", // Thi công
}

// Stage-7 sub-status with the rework loop (inspecting ⇄ rework).
export enum AcceptanceSubStatus {
  REQUEST_SENT = "request_sent", // Gửi yêu cầu
  INSPECTING = "inspecting", // Nghiệm thu
  REWORK = "rework", // Bổ sung
  PASSED = "passed", // Đạt
}

// Stage-5 checklist items; overdue is DERIVED (due_date passed, not approved).
export enum PaperworkStatus {
  PREPARING = "preparing", // Chưa xong
  SUBMITTED = "submitted", // Đã nộp
  APPROVED = "approved", // Đã duyệt
}
