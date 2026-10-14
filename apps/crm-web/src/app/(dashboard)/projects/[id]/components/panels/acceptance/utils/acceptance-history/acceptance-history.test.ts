import { describe, expect, test } from "vitest";

import { AcceptanceNoteTag } from "../../../../../../enums";
import { acceptanceHistory } from "./acceptance-history";

const note = (id: number, tag: string | null, created_at: string) => ({
  id,
  project_id: 1,
  tag,
  body: `n${id}`,
  created_at,
});

describe("acceptanceHistory", () => {
  test("keeps only acceptance tags, newest first", () => {
    const out = acceptanceHistory({
      notes: [
        note(1, AcceptanceNoteTag.SCHEDULED, "2026-09-01T00:00:00.000Z"),
        note(2, "kickoff", "2026-09-02T00:00:00.000Z"),
        note(3, null, "2026-09-03T00:00:00.000Z"),
        note(4, AcceptanceNoteTag.REWORK, "2026-09-04T00:00:00.000Z"),
        note(5, AcceptanceNoteTag.COMPLETED, "2026-09-05T00:00:00.000Z"),
      ],
    });
    expect(out.map((n) => n.id)).toEqual([5, 4, 1]);
  });

  test("handles missing notes", () => {
    expect(acceptanceHistory({ notes: undefined })).toEqual([]);
  });
});
