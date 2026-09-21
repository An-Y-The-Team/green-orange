// Server-assigned document codes: CT-2026-001, HD-2026-004.
//
// Twin of `format_code` / `parse_sequence` / `next_sequence` / `next_code` in
// crm-api's `app/core/rules.py`. Keep the two in step — this decides the number
// printed on a hợp đồng, and the two backends must never issue different ones.
//
// The sequence comes from the CODES already issued for this prefix in this
// year, not from `max(id)`: ids are shared across years, skip on delete and are
// set explicitly by the seed scripts, none of which a document series may do.
// The series restarts at 001 every January, which is the point of the year.
import { businessDateString } from "./business-date";

/** `("CT", 2026, 1)` → `"CT-2026-001"`. The only place the wire format lives. */
export function formatCode(
  prefix: string,
  year: number,
  sequence: number
): string {
  // Three digits is a MINIMUM width, not a cap: the 1000th document of a year
  // is CT-2026-1000, not a wrapped or truncated number.
  return `${prefix}-${year}-${String(sequence).padStart(3, "0")}`;
}

/**
 * The sequence number out of `code`, but only when it belongs to this prefix
 * AND this year — otherwise `null`.
 *
 * `null` is also the answer for anything unparsable. Rows are edited by hand and
 * codes predate this function, so junk must not throw: one bad row somewhere in
 * the table cannot be allowed to block creating a công trình.
 */
export function parseSequence(
  code: string,
  prefix: string,
  year: number
): number | null {
  const expected = `${prefix}-${year}-`;
  if (!code.startsWith(expected)) return null;
  const suffix = code.slice(expected.length);
  // ASCII digits only — no sign, no exponent, not empty. Mirrors the intent of
  // Python's `str.isdecimal()` guard for every code this app has ever written.
  if (!/^[0-9]+$/.test(suffix)) return null;
  return Number(suffix);
}

/**
 * The next number for this prefix in this year, given every code already
 * issued. `1` when the year has none yet — that is how January restarts.
 *
 * Based on the highest code currently stored. If the highest code is deleted
 * that tail number can be reused, because there is no issuance ledger to tell
 * it apart from a number that was never issued. Lower gaps are not filled.
 */
export function nextSequence(
  existingCodes: Iterable<string>,
  prefix: string,
  year: number
): number {
  let highest = 0;
  for (const code of existingCodes) {
    const sequence = parseSequence(code, prefix, year);
    if (sequence !== null && sequence > highest) highest = sequence;
  }
  return highest + 1;
}

// The one shape this needs from a Prisma model delegate: fetch the codes for a
// prefix+year. Structural, so every delegate with a `code` column satisfies it
// without naming a generated union.
type CodeFindMany = {
  findMany: (args: {
    where: { code: { startsWith: string } };
    select: { code: true };
  }) => Promise<{ code: string }[]>;
};

/**
 * Server-assigned document code for the real code families: CT-2026-001,
 * HD-2026-004.
 *
 * ponytail: sequence allocation is based on existing codes and is not
 * race-safe. Concurrent creates can calculate the same code; the unique code
 * constraint makes the loser fail with an integrity conflict, which
 * PrismaExceptionFilter maps to 409. A transactional/retry-based allocator is
 * deferred. Keep this behaviour aligned with crm-api/app/core/rules.py.
 */
export async function nextCode(
  delegate: CodeFindMany,
  prefix: string
): Promise<string> {
  // The Vietnam business year, not the container's. `businessDateString`
  // already resolves the calendar date in Asia/Ho_Chi_Minh, so slicing its
  // YYYY off cannot drift the way `new Date().getFullYear()` would on a
  // UTC-clocked box during the seven hours either side of midnight.
  const year = Number(businessDateString().slice(0, 4));
  // Only this prefix and this year leave Postgres — the count is the series
  // length, never the table.
  const rows = await delegate.findMany({
    where: { code: { startsWith: `${prefix}-${year}-` } },
    select: { code: true },
  });
  return formatCode(
    prefix,
    year,
    nextSequence(
      rows.map((row) => row.code),
      prefix,
      year
    )
  );
}
