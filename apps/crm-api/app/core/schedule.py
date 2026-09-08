"""Assignment windows: does one person's phân công clash with another?

The NestJS twin will be `crm-api-nest/src/crew/crew.module.ts` (`withOverlaps`),
where the same rule currently lives as an inline Prisma `where`. Keep the two in
step — this decides the "Trùng lịch" warning the roster prints.

Double-booking is ALLOWED and common (docs/features/crm-business-flow.md, "Crew
(Nhân sự)"): overlaps are a non-blocking warning, never a refusal.
"""

from collections.abc import Iterable
from datetime import date

# ── Double-booking ──────────────────────────────────────────────────────────
# STUDENT EXERCISE — docs/tasks/02-crew-double-booking.md.
#
# Both functions below are stubs, and both are pure: no session, no ORM row, no
# clock. That is the whole point — every interesting case (open-ended windows,
# windows that merely touch) is one line in a test instead of a fixture.
#
# They exist as stubs rather than as an empty file so the test module imports
# cleanly: a missing name is a collection error, which fails CI on every
# unrelated pull request too.


def ranges_overlap(
    a_from: date, a_to: date | None, b_from: date, b_to: date | None
) -> bool:
    """Do two assignment windows share at least one day?

    `to` of `None` means open-ended — the person is still on that job with no
    end pencilled in, so the window runs forever. Two open-ended windows always
    clash.
    """
    raise NotImplementedError("student exercise: docs/tasks/02-…")


def overlapping_ids(
    windows: Iterable[tuple[int, date, date | None]],
) -> dict[int, list[int]]:
    """`(id, from_date, to_date)` triples in, `{id: [ids it clashes with]}` out.

    Every id gets a key, so a caller never has to handle a missing one — an
    empty list is a real "nothing clashes", not "unknown". An id never lists
    itself. Feed this ONE member's assignments; comparing two different people
    is meaningless.
    """
    raise NotImplementedError("student exercise: docs/tasks/02-…")
