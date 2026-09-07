"""Diacritic-insensitive search keys.

The NestJS twin is `crm-api-nest/src/common/list-query.ts` (`normalizeSearch` /
`unaccented`) plus migration `20260907000000_unaccent_search`, which has
Postgres maintain the same value in a STORED generated column.

Here the `*_norm` columns are PLAIN columns, written by the mapper events in
`app/models/__init__.py`. Two reasons not to copy the generated column: this
backend owns its own database (`crm`), so nothing else writes these rows and
there is nothing to drift from; and the test engine is SQLite, which has no
`unaccent` to generate them with.
"""

import unicodedata


def normalize_search(value: str) -> str:
    """`lower(unaccent(x))` — what a `*_norm` column holds, and what a query is
    folded to before it is compared against one.

    NFD then drop the combining marks. đ/Đ carry no mark, so decomposition
    alone leaves them behind — hence the explicit pair, exactly as the JS twin.
    """
    stripped = "".join(
        ch
        for ch in unicodedata.normalize("NFD", value)
        if not unicodedata.combining(ch)
    )
    return stripped.replace("đ", "d").replace("Đ", "D").lower()
