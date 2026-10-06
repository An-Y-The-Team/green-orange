"""Object-storage key building.

Mirror of `apps/crm-api-nest/src/common/storage.test.ts` — per AGENTS.md the two
backends implement the same contract, so a key built here must be shaped exactly
like one built there.

What must not regress: a filename coming off a browser file picker cannot escape
its project prefix, and the last segment stays the human filename the UI prints.
"""

from app.core.storage import basename, build_key, content_disposition, is_own_key


def key7(filename: str) -> str:
    return build_key(7, None, "survey", filename)


def test_keeps_vietnamese_filename_intact():
    key = key7("Mau Hop Dong.docx")
    assert key.startswith("projects/7/survey/")
    assert basename(key) == "Mau Hop Dong.docx"
    vn = "Biên bản nghiệm thu.pdf"
    assert basename(key7(vn)) == vn


def test_same_name_twice_gets_different_keys():
    assert key7("a.pdf") != key7("a.pdf")


def test_cannot_escape_the_project_prefix():
    for evil in (
        "../../etc/passwd",
        "..\\..\\windows\\system32",
        "/absolute/path.pdf",
        "nested/dir/file.pdf",
    ):
        key = key7(evil)
        assert key.startswith("projects/7/survey/")
        assert len(key.split("/")) == 5, key


def test_strips_control_characters_and_leading_dots():
    assert basename(key7(".hidden.pdf")) == "hidden.pdf"
    assert basename(key7("a\x00b.pdf")) == "ab.pdf"


def test_falls_back_rather_than_empty_segment():
    assert basename(key7("   ")) == "tep"
    assert basename(key7("...")) == "tep"


def test_caps_hostile_filename_length():
    assert len(basename(key7("x" * 500))) == 120


def test_never_cuts_a_surrogate_pair():
    # Python slices code points, so this cannot regress here the way it did in
    # the TS mirror — pinned so the two stay honest about meaning the same thing.
    assert len(basename(key7("x" * 119 + "😀.pdf"))) == 120


def test_own_key_accepts_only_keys_we_minted_for_this_owner_and_kind():
    key = key7("Biên bản.pdf")
    assert is_own_key(7, None, "survey", key)
    # Another project's key, another kind's, a hand-written one, a legacy
    # metadata-only row and an extra path segment all have to be refused: POST
    # /attachments takes this from the client and DELETE removes the object it
    # names.
    assert not is_own_key(8, None, "survey", key)
    assert not is_own_key(70, None, "survey", key)
    assert not is_own_key(7, None, "other", key)
    assert not is_own_key(7, None, "survey", "projects/7/survey/not-a-uuid/x.pdf")
    assert not is_own_key(7, None, "survey", "bien-ban-nghiem-thu.pdf")
    assert not is_own_key(7, None, "survey", key + "/extra.pdf")


def test_crew_key_is_its_own_namespace():
    key = build_key(None, 7, "id_card", "cccd.jpg")
    assert key.startswith("crew/7/id_card/")
    assert is_own_key(None, 7, "id_card", key)
    # Same number, other owner type: project 7 must not claim crew 7's scan.
    assert not is_own_key(7, None, "id_card", key)


def test_legacy_project_keys_without_a_kind_still_match():
    # Uploads made before the kind segment existed must still download.
    legacy = "projects/7/0b3a3c3e-1d2f-4a5b-9c8d-7e6f5a4b3c2d/a.pdf"
    assert is_own_key(7, None, "survey", legacy)
    assert not is_own_key(8, None, "survey", legacy)
    assert not is_own_key(None, 7, "id_card", legacy)


def test_photos_and_pdfs_open_inline_office_files_download():
    assert content_disposition("Ảnh.JPG").startswith("inline;")
    assert content_disposition("bien-ban.pdf").startswith("inline;")
    assert content_disposition("Hop dong.docx").startswith("attachment;")
    assert (
        content_disposition("Nghiệm'thu.xlsx")
        == "attachment; filename*=UTF-8''Nghi%E1%BB%87m%27thu.xlsx"
    )
