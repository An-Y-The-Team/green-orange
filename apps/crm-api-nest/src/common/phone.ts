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
  return /^0\d{9}$/.test(local) ? local : null;
}
