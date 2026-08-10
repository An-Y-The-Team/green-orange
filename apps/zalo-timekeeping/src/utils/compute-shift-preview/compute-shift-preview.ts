// Display-only mirror of the server's computeShiftHours (worker.module.ts) —
// the API recomputes and is the source of truth; this only feeds the "≈ X giờ"
// preview, so out-of-range pairs return null instead of throwing.
export const MAX_SHIFT_HOURS = 16;

export function computeShiftPreview({
  start,
  end,
}: {
  start: string;
  end: string;
}): number | null {
  const toMinutes = (value: string): number | null => {
    const [h, m] = value.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (startMinutes === null || endMinutes === null) return null;
  let diff = endMinutes - startMinutes;
  if (diff <= 0) diff += 24 * 60; // qua đêm
  const hours = Math.round((diff / 60) * 100) / 100;
  return hours > MAX_SHIFT_HOURS ? null : hours;
}
