// Pure-logic unit test (bun test, no DB) — same pattern as business-date.test.ts.
// What must not regress: an absent or hostile ?limit= can never widen the query
// past MAX_PAGE_SIZE, which is the whole point of F17.
import { expect, test } from "bun:test";

import {
  DEFAULT_PAGE_SIZE,
  MAX_OFFSET,
  MAX_PAGE_SIZE,
  pageArgs,
} from "./pagination";

test("no params → the default page, from the start", () => {
  expect(pageArgs({})).toEqual({ take: DEFAULT_PAGE_SIZE, skip: 0 });
});

test("clamps limit to MAX_PAGE_SIZE", () => {
  expect(pageArgs({ limit: String(MAX_PAGE_SIZE + 1) }).take).toBe(
    MAX_PAGE_SIZE
  );
  expect(pageArgs({ limit: "999999" }).take).toBe(MAX_PAGE_SIZE);
});

test("honours a limit inside the cap", () => {
  expect(pageArgs({ limit: "5", offset: "10" })).toEqual({ take: 5, skip: 10 });
  expect(pageArgs({ limit: String(MAX_PAGE_SIZE) }).take).toBe(MAX_PAGE_SIZE);
});

// Every one of these used to be `Number(x)` straight into `take` — NaN, a
// negative take, or take: 0 all mean "the caller sees no rows and no error".
test("nonsense limit floors to the default", () => {
  for (const limit of ["0", "-1", "abc", "1.5", "", " ", "1e999"])
    expect(pageArgs({ limit }).take).toBe(DEFAULT_PAGE_SIZE);
});

test("nonsense offset floors to 0", () => {
  for (const offset of ["-1", "abc", "1.5", ""])
    expect(pageArgs({ offset }).skip).toBe(0);
});

test("clamps offset so a huge skip is an empty page, not a Prisma 500", () => {
  expect(pageArgs({ offset: "99999999999" }).skip).toBe(MAX_OFFSET);
});
