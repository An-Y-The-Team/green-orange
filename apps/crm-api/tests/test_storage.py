"""Object-storage key building.

Mirror of `apps/crm-api-nest/src/common/storage.test.ts` — per AGENTS.md the two
backends implement the same contract, so a key built here must be shaped exactly
like one built there.

What must not regress: a filename coming off a browser file picker cannot escape
its project prefix, and the last segment stays the human filename the UI prints.
"""

from app.core.storage import basename, build_key, is_own_key


def test_keeps_vietnamese_filename_intact():
    key = build_key(7, "Mau Hop Dong.docx")
    assert key.startswith("projects/7/")
    assert basename(key) == "Mau Hop Dong.docx"
    vn = "Biên bản nghiệm thu.pdf"
    assert basename(build_key(7, vn)) == vn


def test_same_name_twice_gets_different_keys():
    assert build_key(7, "a.pdf") != build_key(7, "a.pdf")


def test_cannot_escape_the_project_prefix():
    for evil in (
        "../../etc/passwd",
        "..\\..\\windows\\system32",
        "/absolute/path.pdf",
        "nested/dir/file.pdf",
    ):
        key = build_key(7, evil)
        assert key.startswith("projects/7/")
        assert len(key.split("/")) == 4, key


def test_strips_control_characters_and_leading_dots():
    assert basename(build_key(7, ".hidden.pdf")) == "hidden.pdf"
    assert basename(build_key(7, "a\x00b.pdf")) == "ab.pdf"


def test_falls_back_rather_than_empty_segment():
    assert basename(build_key(7, "   ")) == "tep"
    assert basename(build_key(7, "...")) == "tep"


def test_caps_hostile_filename_length():
    assert len(basename(build_key(7, "x" * 500))) == 120


def test_never_cuts_a_surrogate_pair():
    # Python slices code points, so this cannot regress here the way it did in
    # the TS mirror — pinned so the two stay honest about meaning the same thing.
    assert len(basename(build_key(7, "x" * 119 + "😀.pdf"))) == 120


def test_own_key_accepts_only_keys_we_minted_for_this_project():
    key = build_key(7, "Biên bản.pdf")
    assert is_own_key(7, key)
    # Another project's key, a hand-written one, a legacy metadata-only row, and
    # an extra path segment all have to be refused: POST /attachments takes this
    # from the client and DELETE removes the object it names.
    assert not is_own_key(8, key)
    assert not is_own_key(7, "projects/7/not-a-uuid/x.pdf")
    assert not is_own_key(7, "bien-ban-nghiem-thu.pdf")
    assert not is_own_key(7, key + "/extra.pdf")
