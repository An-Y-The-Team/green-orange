// What must not regress: a filename coming off a browser file picker cannot
// escape its project prefix, and the last segment stays the human filename the
// UI prints — `basename(s3_key)` is the only thing standing between a user and
// seeing a uuid where the file's name should be.
import { describe, expect, test } from "bun:test";

import {
  basename,
  buildKey,
  contentDisposition,
  isOwnKey,
} from "./storage";

const P7 = { project_id: 7 };
const lastSegment = (key: string) => key.split("/").slice(4).join("/");

describe("buildKey", () => {
  test("keeps the Vietnamese filename intact as the last segment", () => {
    const key = buildKey(P7, "survey", "Mau Hop Dong.docx");
    expect(key).toStartWith("projects/7/survey/");
    expect(basename(key)).toBe("Mau Hop Dong.docx");
    expect(basename(buildKey(P7, "survey", "Biên bản nghiệm thu.pdf"))).toBe(
      "Biên bản nghiệm thu.pdf"
    );
  });

  test("two uploads of the same name get different keys", () => {
    expect(buildKey(P7, "survey", "a.pdf")).not.toBe(buildKey(P7, "survey", "a.pdf"));
  });

  test("cannot escape the project prefix", () => {
    for (const evil of [
      "../../etc/passwd",
      "..\\..\\windows\\system32",
      "/absolute/path.pdf",
      "nested/dir/file.pdf",
    ]) {
      const key = buildKey(P7, "survey", evil);
      expect(key).toStartWith("projects/7/survey/");
      expect(lastSegment(key)).not.toInclude("/");
      expect(key.split("/")).toHaveLength(5);
    }
  });

  test("strips control characters and leading dots", () => {
    expect(basename(buildKey(P7, "survey", ".hidden.pdf"))).toBe("hidden.pdf");
    expect(basename(buildKey(P7, "survey", "a\u0000b.pdf"))).toBe("ab.pdf");
  });

  test("falls back rather than producing an empty segment", () => {
    expect(basename(buildKey(P7, "survey", "   "))).toBe("tep");
    expect(basename(buildKey(P7, "survey", "..."))).toBe("tep");
  });

  test("caps a hostile filename length", () => {
    expect(basename(buildKey(P7, "survey", "x".repeat(500))).length).toBe(120);
  });

  // `.slice(0, 120)` cuts UTF-16 units, so an emoji straddling the cut used to
  // leave a lone surrogate and `encodeURIComponent` threw URIError — a 500 on
  // the presign. Slicing by code point is also what Python's `[:120]` does.
  test("never cuts a surrogate pair in half", () => {
    const key = buildKey(P7, "survey", `${"x".repeat(119)}😀.pdf`);
    expect(() => encodeURIComponent(basename(key))).not.toThrow();
    expect([...basename(key)]).toHaveLength(120);
  });
});

describe("isOwnKey", () => {
  test("accepts only keys we minted for this owner and kind", () => {
    const key = buildKey(P7, "survey", "Biên bản.pdf");
    expect(isOwnKey(P7, "survey", key)).toBe(true);
    // Another project's key, another kind's, a hand-written one, a legacy
    // metadata-only row, and an extra path segment all have to be refused:
    // POST /attachments takes this from the client and DELETE removes the
    // object it names.
    expect(isOwnKey({ project_id: 8 }, "survey", key)).toBe(false);
    expect(isOwnKey({ project_id: 70 }, "survey", key)).toBe(false);
    expect(isOwnKey(P7, "other", key)).toBe(false);
    expect(isOwnKey(P7, "survey", "projects/7/survey/not-a-uuid/x.pdf")).toBe(
      false
    );
    expect(isOwnKey(P7, "survey", "bien-ban-nghiem-thu.pdf")).toBe(false);
    expect(isOwnKey(P7, "survey", `${key}/extra.pdf`)).toBe(false);
  });

  test("a crew key is its own namespace", () => {
    const key = buildKey({ crew_member_id: 7 }, "id_card", "cccd.jpg");
    expect(key).toStartWith("crew/7/id_card/");
    expect(isOwnKey({ crew_member_id: 7 }, "id_card", key)).toBe(true);
    // Same number, other owner type: project 7 must not claim crew 7's scan.
    expect(isOwnKey(P7, "id_card", key)).toBe(false);
  });

  // Uploads made before the kind segment existed must still download.
  test("legacy project keys without a kind still match their project", () => {
    const legacy = "projects/7/0b3a3c3e-1d2f-4a5b-9c8d-7e6f5a4b3c2d/a.pdf";
    expect(isOwnKey(P7, "survey", legacy)).toBe(true);
    expect(isOwnKey({ project_id: 8 }, "survey", legacy)).toBe(false);
    expect(isOwnKey({ crew_member_id: 7 }, "id_card", legacy)).toBe(false);
  });
});

describe("contentDisposition", () => {
  test("photos and PDFs open in the browser, office files download", () => {
    expect(contentDisposition("Ảnh.JPG")).toStartWith("inline;");
    expect(contentDisposition("bien-ban.pdf")).toStartWith("inline;");
    expect(contentDisposition("Hop dong.docx")).toStartWith("attachment;");
    expect(contentDisposition("Nghiệm'thu.xlsx")).toBe(
      "attachment; filename*=UTF-8''Nghi%E1%BB%87m%27thu.xlsx"
    );
  });
});
