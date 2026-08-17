"""Shared list-endpoint plumbing: bounded pages, X-Total-Count, search, sort.

The NestJS twin is `crm-api-nest/src/common/{pagination,list-query}.ts`. Anything
the client controls — page size, filters, sort, search — goes through here so a
hostile or mangled query string cannot turn a list read into a full-table scan.
"""

from dataclasses import dataclass
from typing import Annotated, Any

from fastapi import Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlmodel import Session, select
from sqlmodel.sql.expression import SelectOfScalar

# Deliberately larger than a web page: several callers aggregate the whole array
# (dashboard debt totals, timekeeping hours), so a small default would silently
# return wrong numbers instead of visibly paginating.
DEFAULT_PAGE_SIZE = 100
MAX_PAGE_SIZE = 500
# OFFSET is a scan. Past this depth the answer is keyset pagination, not a
# bigger offset.
MAX_OFFSET = 1_000_000

# A header, not a `{rows, total}` envelope: additive, so every existing consumer
# keeps reading a bare array and each page opts in when it wants the number.
TOTAL_COUNT_HEADER = "X-Total-Count"


@dataclass
class Page:
    limit: int
    offset: int


def _int_or_default(raw: str | None, minimum: int, fallback: int) -> int:
    """Nonsense (missing, not a number, negative, fractional) floors to the
    default rather than 400ing — a list view with a mangled query string should
    still render its first page."""
    try:
        value = int(raw)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return fallback
    return value if value >= minimum else fallback


def page_params(
    limit: Annotated[str | None, Query()] = None,
    offset: Annotated[str | None, Query()] = None,
) -> Page:
    return Page(
        limit=min(_int_or_default(limit, 1, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE),
        offset=min(_int_or_default(offset, 0, 0), MAX_OFFSET),
    )


PageDep = Annotated[Page, Depends(page_params)]


def paged(
    session: Session,
    response: Response,
    statement: SelectOfScalar,
    page: Page,
) -> list[Any]:
    """One page of `statement`, plus the row count of the WHOLE filtered set in
    `X-Total-Count`.

    The count is taken from the same statement as the rows, so it cannot
    describe a different filter than the page it labels. Pair `statement` with a
    total ordering (a unique tiebreaker) or pages overlap.
    """
    total = session.exec(
        select(func.count()).select_from(statement.order_by(None).subquery())
    ).one()
    response.headers[TOTAL_COUNT_HEADER] = str(total)
    return list(session.exec(statement.offset(page.offset).limit(page.limit)).all())


def ilike(column: Any, search: str) -> Any:
    """Case-insensitive substring match with the LIKE wildcards escaped —
    without it a search for "%" matches every row and "_" any character."""
    escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return column.ilike(f"%{escaped}%", escape="\\")


def csv_filter(
    value: str | None, allowed: tuple[str, ...], name: str
) -> list[str] | None:
    """`?status=a,b` → ["a", "b"]. Empty and missing both mean "no filter"; an
    unknown value is a 400 rather than a silently empty result."""
    parts = [p.strip() for p in (value or "").split(",") if p.strip()]
    if not parts:
        return None
    unknown = [p for p in parts if p not in allowed]
    if unknown:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"{name} must be one of {', '.join(allowed)}",
        )
    return parts


def order_by(
    columns: dict[str, Any],
    sort_by: str | None,
    sort_order: str | None,
    fallback: list[Any],
    tiebreak: Any,
) -> list[Any]:
    """Whitelisted, client-controlled sort.

    A chosen sort always gets the `id` tiebreak — every sortable column here is
    non-unique, and without a total order pages overlap. No `sort_by` keeps the
    endpoint's historical default order.
    """
    if not sort_by:
        return fallback
    column = columns[sort_by]
    return [column.desc() if sort_order == "desc" else column.asc(), tiebreak.desc()]
