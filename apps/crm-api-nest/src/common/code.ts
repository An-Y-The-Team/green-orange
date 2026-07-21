// Server-assigned document codes: CT-2026-001, BG-2026-002, HD-…, QT-…
// ponytail: the year is hardcoded 2026 to match the Python backend's
// f"CT-2026-{n:03d}" exactly; make it dynamic if the app outlives the teaching term.
export function formatCode(prefix: string, n: number): string {
  return `${prefix}-2026-${String(n).padStart(3, "0")}`;
}

// Next sequence number for a resource = (max existing id) + 1, matching the
// Python backend. `delegate` is any Prisma model delegate (has aggregate()).
// ponytail: not race-safe under concurrent inserts — fine for this app, same
// caveat the Python backend carries.
export async function nextCode(
  delegate: { aggregate: (args: any) => Promise<any> },
  prefix: string
): Promise<string> {
  const res = await delegate.aggregate({ _max: { id: true } });
  return formatCode(prefix, ((res?._max?.id as number | null) ?? 0) + 1);
}
