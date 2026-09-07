import { localTimeOf } from "../today-iso/today-iso";

/**
 * Full ISO instant → local `HH:mm`. Nullable input yields "".
 *
 * The dashboard's "Hôm nay" panel printed `formatDate(appointment_at)`, so every
 * row read today's date — which the panel title already said — while dropping
 * the 09:00 that is the whole point of a day plan. `/field`'s appointment card
 * dropped it too.
 *
 * Reads the LOCAL clock via `localTimeOf`, never `iso.slice(11, 16)`: that is
 * the UTC clock, so a 06:30 ICT appointment would print 23:30.
 */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const time = localTimeOf(iso);
  return time === "NaN:NaN" ? "" : time;
}
