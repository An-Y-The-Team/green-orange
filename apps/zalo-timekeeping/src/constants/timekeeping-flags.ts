// Mirrors crm-api-nest's worker.module.ts. MAX_SHIFT_HOURS is duplicated rather
// than fetched because it appears in copy the worker reads ("tính tối đa 16
// giờ"); the server remains the only thing that enforces it.
export const MAX_SHIFT_HOURS = 16;

/** TimekeepingLog.flag when a clock-out ran past MAX_SHIFT_HOURS. */
export const FLAG_OVER_CAP = "over_cap";
