"""The shared list plumbing: page clamps, the stage machine, document codes."""

from app.api.common import (
    DEFAULT_PAGE_SIZE,
    MAX_OFFSET,
    MAX_PAGE_SIZE,
    page_params,
)
from app.core.rules import STAGE_ORDER, should_advance


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
