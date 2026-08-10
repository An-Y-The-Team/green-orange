// Nhân sự — v2 contract values (English); labels in src/constants/labels.ts.
// Roles are a user-managed DB entity (CrewRole rows), NOT an enum.

export enum EmploymentType {
  PERMANENT = "permanent", // Chính thức
  DAY_HIRE = "day_hire", // Thời vụ — common; keep records for re-hire
}

export enum CrewMemberStatus {
  WORKING = "working", // Đang làm
  ON_LEAVE = "on_leave", // Tạm nghỉ
  LEFT = "left", // Nghỉ việc
}

export enum TimekeepingSource {
  MANUAL = "manual", // source of truth
  ZALO_APP = "zalo_app", // mini-app feed, read-only in UI
}

export enum TimekeepingStatus {
  PENDING = "pending", // Chờ duyệt — mini-app submission awaiting the operator
  APPROVED = "approved", // Đã duyệt — manual rows are born approved
  REJECTED = "rejected", // Từ chối — worker may resubmit (back to pending)
}
