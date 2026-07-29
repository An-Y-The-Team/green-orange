/**
 * ISO date (YYYY-MM-DD or full ISO) → dd/MM/yyyy. Unparsable → unchanged.
 *
 * Nullable input is accepted and yields "" — the API returns `null` for every
 * optional date column and several call sites interpolate the result into a
 * template literal, where a passed-through `null` printed the word "null".
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
