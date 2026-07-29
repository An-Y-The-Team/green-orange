// `is_latest` on GET /quotes (bun test, fake prisma, no DB — same pattern as
// receivables.test.ts). What must not regress: the flag is answered by the DB's
// max version per project, NOT by the rows that happen to be on this page, so it
// stays right under an `offset` or a different `orderBy`.
import { describe, expect, test } from "bun:test";
import type { Response } from "express";

import { QuotesController, withIsLatest } from "./quotes.module";

// The handler now sets X-Total-Count; these tests only care about the rows, so
// the stub swallows the header. See pagination.test.ts for the count itself.
const res = () => ({ setHeader: () => {} }) as unknown as Response;

type Row = { id: number; project_id: number | null; version: number };

// `maxima` is what the DB knows; `rows` is only what this page fetched. Keeping
// them separate is the whole point of the test.
const fake = (
  rows: Row[],
  maxima: { project_id: number; version: number }[]
) => {
  const findManyArgs: any[] = [];
  const groupByArgs: any[] = [];
  return {
    findManyArgs,
    groupByArgs,
    quote: {
      findMany: async (args: any) => {
        findManyArgs.push(args);
        return rows;
      },
      count: async () => rows.length,
      groupBy: async (args: any) => {
        groupByArgs.push(args);
        const wanted: number[] = args.where.project_id.in;
        return maxima
          .filter((m) => wanted.includes(m.project_id))
          .map((m) => ({
            project_id: m.project_id,
            _max: { version: m.version },
          }));
      },
    },
  } as any;
};

const flags = async (prisma: any) =>
  (await new QuotesController(prisma).list(res(), {})).map((q: any) => [
    q.id,
    q.is_latest,
  ]);

describe("GET /quotes → is_latest", () => {
  test("v1 + v2 of one project: only v2 is latest", async () => {
    const prisma = fake(
      [
        { id: 2, project_id: 5, version: 2 },
        { id: 1, project_id: 5, version: 1 },
      ],
      [{ project_id: 5, version: 2 }]
    );
    expect(await flags(prisma)).toEqual([
      [2, true],
      [1, false],
    ]);
    // One aggregate for the whole page, not one per row.
    expect(prisma.groupByArgs.length).toBe(1);
    expect(prisma.groupByArgs[0].where.project_id.in).toEqual([5]);
  });

  test("a project with a single version: that version is latest", async () => {
    const prisma = fake(
      [{ id: 7, project_id: 9, version: 1 }],
      [{ project_id: 9, version: 1 }]
    );
    expect(await flags(prisma)).toEqual([[7, true]]);
  });

  test("a standalone quote (project_id: null) is latest, and asks the DB nothing", async () => {
    const prisma = fake([{ id: 4, project_id: null, version: 1 }], []);
    expect(await flags(prisma)).toEqual([[4, true]]);
    expect(prisma.groupByArgs).toEqual([]);
  });

  // The bug this replaced: page 1 held both versions, so a page-local max worked
  // by accident. Here the newer sibling (v2, id 2) is on page 1 and this page
  // holds only v1 — a max built from these rows is 1, which would call the
  // superseded row "latest". The DB says 2, so the badge is right.
  test("page 2: a v1 whose newer sibling is off-page is still not latest", async () => {
    const rows: Row[] = [{ id: 1, project_id: 5, version: 1 }];
    expect(Math.max(...rows.map((r) => r.version))).toBe(1); // the old page-local answer
    const prisma = fake(rows, [{ project_id: 5, version: 2 }]);
    expect(await flags(prisma)).toEqual([[1, false]]);
  });

  test("?project_id= keeps the DETAIL include and carries no flag", async () => {
    const prisma = fake(
      [{ id: 1, project_id: 5, version: 1 }],
      [{ project_id: 5, version: 2 }]
    );
    const rows = await new QuotesController(prisma).list(res(), {}, "5");
    expect(prisma.findManyArgs[0].include.items).toBeTruthy(); // F22/F23 split
    expect(prisma.groupByArgs).toEqual([]);
    expect(rows[0]).not.toHaveProperty("is_latest");
  });
});

describe("withIsLatest", () => {
  test("keeps every other column on the row", async () => {
    const prisma = fake([], [{ project_id: 5, version: 2 }]);
    const [row] = await withIsLatest(prisma, [
      { project_id: 5, version: 2, total_amount: 480_000_000n },
    ]);
    expect(row).toEqual({
      project_id: 5,
      version: 2,
      total_amount: 480_000_000n,
      is_latest: true,
    });
  });
});
