// The pipe-facing contract of ListQueryDto subclasses, run through a REAL
// ValidationPipe configured exactly like main.ts. The one behavior worth a
// test above all: `whitelist: true` starts stripping undeclared query keys the
// moment a DTO class is bound — `limit`/`offset` surviving is what keeps every
// existing pager working.
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { describe, expect, test } from "bun:test";
import { IsIn, IsInt, IsOptional } from "class-validator";

import { CsvIn, CsvIntIn, ListQueryDto, insensitive, normalizeSearch, orderByArgs, unaccented } from "./list-query";

class FixtureQuery extends ListQueryDto {
  @IsOptional() @CsvIn() @IsIn(["a", "b", "c"], { each: true }) tag?: string[];
  @IsOptional() @CsvIntIn() @IsInt({ each: true }) role_id?: number[];
  @IsOptional() @IsIn(["name"]) sort_by?: "name";
}

const pipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

const parse = (query: Record<string, unknown>): Promise<FixtureQuery> =>
  pipe.transform(query, { type: "query", metatype: FixtureQuery }) as never;

describe("ListQueryDto through the real ValidationPipe", () => {
  test("limit/offset survive whitelisting (existing pagers depend on it)", async () => {
    const q = await parse({ limit: "5", offset: "10" });
    expect(q.limit).toBe("5");
    expect(q.offset).toBe("10");
  });

  test("undeclared junk keys are stripped, not 400ed", async () => {
    const q = await parse({ tag: "a", junk: "x" });
    expect("junk" in q).toBe(false);
  });

  test("csv splits, trims, and validates each value", async () => {
    expect((await parse({ tag: "a, b" })).tag).toEqual(["a", "b"]);
    await expect(parse({ tag: "a,zzz" })).rejects.toThrow(BadRequestException);
  });

  test("empty csv means no filter, like the old `x || undefined`", async () => {
    expect((await parse({ tag: "" })).tag).toBeUndefined();
  });

  test("int csv converts; a non-number 400s", async () => {
    expect((await parse({ role_id: "1,2" })).role_id).toEqual([1, 2]);
    await expect(parse({ role_id: "1,x" })).rejects.toThrow(
      BadRequestException
    );
  });

  test("sort_by outside the whitelist → 400; sort_order validated", async () => {
    await expect(parse({ sort_by: "secret_column" })).rejects.toThrow(
      BadRequestException
    );
    await expect(parse({ sort_order: "sideways" })).rejects.toThrow(
      BadRequestException
    );
    expect((await parse({ sort_by: "name", sort_order: "desc" })).sort_by).toBe(
      "name"
    );
  });

  test("oversized search 400s", async () => {
    await expect(parse({ search: "x".repeat(301) })).rejects.toThrow(
      BadRequestException
    );
  });
});

describe("insensitive", () => {
  test("escapes LIKE wildcards so they match literally", () => {
    expect(insensitive("100%_A\\B").contains).toBe("100\\%\\_A\\\\B");
    expect(insensitive("villa").contains).toBe("villa");
  });
});

describe("orderByArgs", () => {
  const map = { name: (o: "asc" | "desc") => ({ name: o }) };

  test("chosen sort gets the id tiebreak", () => {
    expect(
      orderByArgs({ map, sortBy: "name", sortOrder: "desc", fallback: [] })
    ).toEqual([{ name: "desc" }, { id: "desc" }]);
  });

  test("no sort_by keeps the endpoint's historical default order", () => {
    expect(
      orderByArgs({
        map,
        sortBy: undefined,
        sortOrder: "desc",
        fallback: [{ id: "asc" }],
      })
    ).toEqual([{ id: "asc" }]);
  });
});

// The bug this is the fix for: every search box folded case but not accents, so
// `an phat` returned ZERO rows for "Công ty TNHH An Phát" — not a longer list,
// nothing. The query side must fold exactly the way the Postgres generated
// column does (`lower(unaccent(name))`), or the two never meet.
describe("normalizeSearch (query side of the *_norm columns)", () => {
  test("folds Vietnamese tone marks and case", () => {
    expect(normalizeSearch("Công ty TNHH An Phát")).toBe(
      "cong ty tnhh an phat"
    );
    expect(normalizeSearch("Nguyễn Thị Hoa")).toBe("nguyen thi hoa");
    expect(normalizeSearch("Vệ sinh kính")).toBe("ve sinh kinh");
  });

  // đ/Đ is the one Vietnamese letter NFD decomposition does not fold: it is a
  // distinct letter, not a base + combining mark. Postgres's unaccent maps it
  // to d, so this has to as well.
  test("folds đ and Đ, which decomposition alone leaves alone", () => {
    expect(normalizeSearch("Đà Nẵng")).toBe("da nang");
    expect(normalizeSearch("Đội thi công đường")).toBe("doi thi cong duong");
  });

  test("an already-plain query is unchanged", () => {
    expect(normalizeSearch("an phat")).toBe("an phat");
    expect(normalizeSearch("CT-2026-001")).toBe("ct-2026-001");
  });

  test("the query and the stored value meet in the middle", () => {
    // What Postgres stores for the row, computed the same way:
    const stored = normalizeSearch("Công ty TNHH An Phát");
    // …and what a hurried operator types:
    for (const typed of ["an phat", "An Phát", "AN PHAT", "ty tnhh"]) {
      expect(stored).toContain(normalizeSearch(typed));
    }
  });
});

describe("unaccented (the Prisma predicate)", () => {
  test("normalizes and drops the case-insensitive mode", () => {
    // `mode: insensitive` would be redundant — the column is already lowered —
    // and on a citext-free column it costs an extra ILIKE.
    expect(unaccented("An Phát")).toEqual({ contains: "an phat" });
  });

  test("still escapes LIKE wildcards", () => {
    // Without this a search of "%" matched every row.
    expect(unaccented("100%").contains).toBe("100\\%");
    expect(unaccented("a_b").contains).toBe("a\\_b");
  });
});
