import { describe, expect, it } from "vitest";

import {
  ACCEPT,
  ATTACHMENT_TYPES,
  MAX_BYTES,
  guessType,
} from "./attachment-types";

/**
 * The drift guard. Both backends keep their own allowlist — two services, two
 * languages, so the repo's rule is "change one, change the other" (AGENTS.md)
 * rather than a shared import. This pins the third copy to them: add a type to
 * the picker without adding it to `ALLOWED_CONTENT_TYPES` in
 * `crm-api-nest/src/common/storage.ts` AND `crm-api/app/core/storage.py`, and
 * this fails instead of the user meeting a 400 at upload time.
 */
const BACKEND_ALLOWLIST = [
  "application/msword",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
];

describe("attachment types", () => {
  it("offers exactly the MIME types both backends allow", () => {
    const offered = [...new Set(Object.values(ATTACHMENT_TYPES))].sort();
    expect(offered).toEqual(BACKEND_ALLOWLIST);
  });

  it("derives the picker's accept list from the same table", () => {
    expect(ACCEPT).toBe(".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp");
  });

  it("guesses a type for the Office files browsers report as empty", () => {
    expect(guessType("Mau Hop Dong.docx")).toBe(ATTACHMENT_TYPES.docx);
    expect(guessType("Bang gia.XLSX")).toBe(ATTACHMENT_TYPES.xlsx);
    expect(guessType("Biên bản nghiệm thu.pdf")).toBe(ATTACHMENT_TYPES.pdf);
  });

  it("falls back to a type the backend will refuse, not to a lie", () => {
    // Refusing loudly beats mislabelling an .exe as a .pdf to get it past the
    // allowlist — the content type is signed into the URL.
    expect(guessType("payload.exe")).toBe("application/octet-stream");
    expect(guessType("noextension")).toBe("application/octet-stream");
    expect(BACKEND_ALLOWLIST).not.toContain(guessType("payload.exe"));
  });

  it("caps uploads where both backends do", () => {
    expect(MAX_BYTES).toBe(25 * 1024 * 1024);
  });
});
