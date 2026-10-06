/**
 * The canonical stored form: a local 10-digit Vietnamese mobile number.
 *
 * Exported so the write path's validator, the normalizer below and anything
 * else that asserts the shape share one definition — the three used to be
 * separate and drifted, which is how non-canonical rows got onto the roster.
 */
export const LOCAL_PHONE = /^0\d{9}$/;

// Normalizes Vietnamese phone numbers to the local 10-digit "0…" form used as
// the CrewMember.phone identity: "+84 912-345-678" | "84912345678" |
// "0912 345 678" → "0912345678"; anything else → null. Must stay in sync with
// the SQL in prisma/migrations/20260908000000_zalo_timekeeping.
export function normalizePhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  const local =
    digits.startsWith("84") && digits.length === 11
      ? `0${digits.slice(2)}`
      : digits;
  return LOCAL_PHONE.test(local) ? local : null;
}

/**
 * `@Transform` for the `phone` field on the crew write DTOs.
 *
 * CrewMember.phone is the mini app's login identity: `auth.service.ts`
 * normalizes whatever Zalo returns and looks it up with an exact `findUnique`.
 * Nothing used to normalize on the way IN, so an operator typing the form's own
 * placeholder ("0901 234 567", with spaces) stored a row that login could never
 * match — the worker was told their number was not registered and the operator
 * got no signal at all. The `@unique` index did not help either: "0912345678"
 * and "+84912345678" are different strings for the same person.
 *
 * Exported for the unit test.
 */
export const toLocalPhone = ({ value }: { value: unknown }): unknown => {
  // Key absent (a PATCH that does not touch the phone) — leave the column alone.
  if (value === undefined) return undefined;
  // Cleared in the form — store NULL, the same thing the migration did to ''.
  if (value === null || value === "") return null;
  // Unparseable input is handed back RAW on purpose: returning null here would
  // make @IsOptional skip the validator and silently drop the number instead of
  // answering 400.
  return normalizePhone(String(value)) ?? value;
};
