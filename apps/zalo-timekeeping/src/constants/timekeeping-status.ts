// Mirrors crm-api-nest's TIMEKEEPING_STATUS_* constants (v2 contract values).
export enum TimekeepingStatus {
  // Clocked in, not yet out: hours are 0 and the shift counts nowhere until
  // clock-out flips it to PENDING.
  OPEN = "open",
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export const TIMEKEEPING_STATUS_LABELS: Record<TimekeepingStatus, string> = {
  [TimekeepingStatus.OPEN]: "Đang làm",
  [TimekeepingStatus.PENDING]: "Chờ duyệt",
  [TimekeepingStatus.APPROVED]: "Đã duyệt",
  [TimekeepingStatus.REJECTED]: "Từ chối",
};

// Status is never carried by colour alone (WCAG 1.4.1) — and a glyph reads
// faster than a word for a worker skimming a month of rows.
export const TIMEKEEPING_STATUS_GLYPHS: Record<TimekeepingStatus, string> = {
  [TimekeepingStatus.OPEN]: "●",
  [TimekeepingStatus.PENDING]: "…",
  [TimekeepingStatus.APPROVED]: "✓",
  [TimekeepingStatus.REJECTED]: "✕",
};
