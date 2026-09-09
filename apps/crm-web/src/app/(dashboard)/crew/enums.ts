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
  OPEN = "open", // Đang làm — clocked in, not out; hours 0, counts nowhere, not decidable
  PENDING = "pending", // Chờ duyệt — mini-app submission awaiting the operator
  APPROVED = "approved", // Đã duyệt — manual rows are born approved
  REJECTED = "rejected", // Từ chối — worker may resubmit (back to pending)
}

/**
 * TimekeepingRecord.flag — set by the API, never by this app.
 *
 * A closed set of one today, so an `as const` object rather than an enum would
 * read as speculative structure; it is here so the badge and any future value
 * share one source of truth.
 */
export enum TimekeepingFlag {
  OVER_CAP = "over_cap", // clocked out past the 16h cap — hours clamped, needs a look
}
