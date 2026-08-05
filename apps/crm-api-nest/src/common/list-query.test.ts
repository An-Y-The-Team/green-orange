// The pipe-facing contract of ListQueryDto subclasses, run through a REAL
// ValidationPipe configured exactly like main.ts. The one behavior worth a
// test above all: `whitelist: true` starts stripping undeclared query keys the
// moment a DTO class is bound — `limit`/`offset` surviving is what keeps every
// existing pager working.
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { describe, expect, test } from "bun:test";
import { IsIn, IsInt, IsOptional } from "class-validator";

import {
  CsvIn,
  CsvIntIn,
  insensitive,
  ListQueryDto,
  orderByArgs,
} from "./list-query";

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
