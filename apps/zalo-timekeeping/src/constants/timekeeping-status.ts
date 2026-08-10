// Mirrors crm-api-nest's TIMEKEEPING_STATUS_* constants (v2 contract values).
export enum TimekeepingStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export const TIMEKEEPING_STATUS_LABELS: Record<TimekeepingStatus, string> = {
  [TimekeepingStatus.PENDING]: "Chờ duyệt",
  [TimekeepingStatus.APPROVED]: "Đã duyệt",
  [TimekeepingStatus.REJECTED]: "Từ chối",
};
