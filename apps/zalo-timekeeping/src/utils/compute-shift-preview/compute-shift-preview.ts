// Display-only mirror of the server's computeShiftHours (worker.module.ts) —
// the API recomputes and is the source of truth; this only feeds the "≈ X giờ"
// preview, so out-of-range pairs return null instead of throwing.
export const MAX_SHIFT_HOURS = 16;

// Same shape the API's DTO accepts (HH_MM in worker.module.ts) — an empty or
// half-typed <input type="time"> must read as null, not NaN, or the submit
// button unlocks on "≈ NaN giờ".
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function computeShiftPreview({
  start,
  end,
}: {
  start: string;
  end: string;
}): number | null {
  const toMinutes = (value: string): number | null =>
    HH_MM.test(value)
      ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3))
      : null;
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (startMinutes === null || endMinutes === null) return null;
  let diff = endMinutes - startMinutes;
  if (diff <= 0) diff += 24 * 60; // qua đêm
  const hours = Math.round((diff / 60) * 100) / 100;
  return hours > MAX_SHIFT_HOURS ? null : hours;
}
