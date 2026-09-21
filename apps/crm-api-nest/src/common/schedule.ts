// Assignment windows: does one person's phân công clash with another?
//
// Twin of crm-api's `app/core/schedule.py`. Keep the two in step — this decides
// the "Trùng lịch" warning the roster prints.
//
// The same rule also lives as a Prisma `where` in `crew.module.ts`
// (`withOverlaps`), which is what the write path uses: indexed, and it does not
// pull a member's whole roster into memory. These two must agree in every case
// or POST and GET tell the operator different things about the same two rows.
//
// Double-booking is ALLOWED and common (docs/features/crm-business-flow.md,
// "Crew (Nhân sự)"): overlaps are a non-blocking warning, never a refusal.

/**
 * Do two assignment windows share at least one day?
 *
 * `to` of `null` means open-ended — the person is still on that job with no end
 * pencilled in, so the window runs forever. Two open-ended windows always clash.
 *
 * A window that ends the same day another begins DOES clash: nobody is on two
 * sites in one day, and the write path already answers "clash" for that case.
 */
export function rangesOverlap(
  aFrom: Date,
  aTo: Date | null,
  bFrom: Date,
  bTo: Date | null
): boolean {
  return (aTo === null || bFrom <= aTo) && (bTo === null || aFrom <= bTo);
}

/**
 * `[id, from_date, to_date]` triples in, `{id: [ids it clashes with]}` out.
 *
 * Every id gets a key, so a caller never has to handle a missing one — an empty
 * array is a real "nothing clashes", not "unknown". An id never lists itself.
 * Feed this ONE member's assignments; comparing two different people is
 * meaningless, because two people on one site on one day is a crew.
 *
 * Pairs are compared once and recorded on both sides, so this is O(n²/2) rather
 * than every ordered pair, and it reports no transitive clashes: A-B and B-C
 * overlapping does not make A and C overlap.
 */
export function overlappingIds(
  windows: Iterable<[number, Date, Date | null]>
): Map<number, number[]> {
  const assignments = [...windows];
  const overlaps = new Map<number, number[]>(
    assignments.map(([id]) => [id, []])
  );

  for (let i = 0; i < assignments.length; i++) {
    const [id, from, to] = assignments[i];
    for (let j = i + 1; j < assignments.length; j++) {
      const [otherId, otherFrom, otherTo] = assignments[j];
      if (rangesOverlap(from, to, otherFrom, otherTo)) {
        overlaps.get(id)!.push(otherId);
        overlaps.get(otherId)!.push(id);
      }
    }
  }

  return overlaps;
}
