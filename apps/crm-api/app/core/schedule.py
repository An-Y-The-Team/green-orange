"""Assignment windows: does one person's phân công clash with another?

The NestJS twin is `crm-api-nest/src/common/schedule.ts`. The same rule also
lives as an inline Prisma `where` in `crm-api-nest/src/crew/crew.module.ts`
(`withOverlaps`), which is what that backend's write path uses. Keep all three in
step — this decides the "Trùng lịch" warning the roster prints.

Double-booking is ALLOWED and common (docs/features/crm-business-flow.md, "Crew
(Nhân sự)"): overlaps are a non-blocking warning, never a refusal.
"""

from collections.abc import Iterable
from datetime import date


def ranges_overlap(
    a_from: date, a_to: date | None, b_from: date, b_to: date | None
) -> bool:
    """Do two assignment windows share at least one day?

    `to` of `None` means open-ended — the person is still on that job with no
    end pencilled in, so the window runs forever. Two open-ended windows always
    clash.
    """
    return (a_to is None or b_from <= a_to) and (b_to is None or a_from <= b_to)


def overlapping_ids(
    windows: Iterable[tuple[int, date, date | None]],
) -> dict[int, list[int]]:
    """`(id, from_date, to_date)` triples in, `{id: [ids it clashes with]}` out.

    Every id gets a key, so a caller never has to handle a missing one — an
    empty list is a real "nothing clashes", not "unknown". An id never lists
    itself. Feed this ONE member's assignments; comparing two different people
    is meaningless.
    """
    assignments = list(windows)
    overlaps = {assignment_id: [] for assignment_id, _, _ in assignments}

    for index, (assignment_id, from_date, to_date) in enumerate(assignments):
        for other_id, other_from, other_to in assignments[index + 1 :]:
            if ranges_overlap(from_date, to_date, other_from, other_to):
                overlaps[assignment_id].append(other_id)
                overlaps[other_id].append(assignment_id)

    return overlaps
