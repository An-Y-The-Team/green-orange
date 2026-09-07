"""The shared list plumbing: page clamps, the stage machine, document codes."""

from datetime import UTC, date, datetime, timedelta

from app.api.common import (
    DEFAULT_PAGE_SIZE,
    MAX_OFFSET,
    MAX_PAGE_SIZE,
    page_params,
)
from app.core.rules import STAGE_ORDER, business_day_range, should_advance
from app.core.search import normalize_search


def test_page_params_clamps_and_floors_nonsense():
    assert page_params() == page_params(None, None)
    assert page_params("25", "50").limit == 25
    assert page_params("25", "50").offset == 50
    assert page_params("9999", None).limit == MAX_PAGE_SIZE
    assert page_params(None, "99999999").offset == MAX_OFFSET
    # A mangled query string still renders its first page instead of 400ing.
    for bad in ("0", "-1", "1.5", "abc", ""):
        assert page_params(bad, bad).limit == DEFAULT_PAGE_SIZE
        assert page_params(bad, bad).offset == 0


def test_stage_advance_is_forward_only_and_never_leaves_closed():
    assert STAGE_ORDER[0] == "request" and STAGE_ORDER[-1] == "closed"
    assert should_advance("request", "quote") is True
    assert should_advance("quote", "request") is False
    assert should_advance("quote", "quote") is False
    # A closed công trình is reopened explicitly, never by doing work on it.
    assert should_advance("closed", "settlement") is False


def test_normalize_search_folds_tone_marks_and_the_vietnamese_d():
    # `an phat` has to find "An Phát", which is how the name is typed at speed.
    assert normalize_search("Công ty TNHH An Phát") == "cong ty tnhh an phat"
    # đ/Đ carry no combining mark, so NFD alone would leave them behind.
    assert normalize_search("Đường Đá") == "duong da"
    assert normalize_search("ACME") == "acme"


def test_business_day_range_is_the_local_day_not_the_utc_one():
    start, end = business_day_range(date(2026, 9, 8))
    # 00:00 +07:00 is 17:00Z the day BEFORE — comparing UTC date prefixes is
    # what would drop an 06:30 ICT appointment from "today" all day.
    assert start == datetime(2026, 9, 7, 17, 0, tzinfo=UTC)
    assert end == datetime(2026, 9, 8, 17, 0, tzinfo=UTC)
    assert end - start == timedelta(days=1)
