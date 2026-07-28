import { expect, test } from "bun:test";

import { businessDateString, businessToday } from "./business-date";

// The bug this guards: `new Date()` into a @db.Date column, read back via the
// interceptor's UTC `toISOString().slice(0, 10)`, reported the previous day for
// anything stamped between 00:00 and 07:00 Vietnam time.
test("resolves the business date, not the UTC date", () => {
  // 00:30 on the 29th in Vietnam is still the 28th in UTC.
  const earlyMorning = new Date("2026-07-28T17:30:00.000Z");
  expect(businessDateString(earlyMorning)).toBe("2026-07-29");
});

test("round-trips through the interceptor's UTC slice", () => {
  const earlyMorning = new Date("2026-07-28T17:30:00.000Z");
  // How serialize.interceptor.ts renders a *_date column back to the client.
  const asWire = businessToday(earlyMorning).toISOString().slice(0, 10);
  expect(asWire).toBe("2026-07-29");
});

test("is stable across the working day", () => {
  const morning = new Date("2026-07-29T02:00:00.000Z"); // 09:00 ICT
  const evening = new Date("2026-07-29T11:00:00.000Z"); // 18:00 ICT
  expect(businessDateString(morning)).toBe("2026-07-29");
  expect(businessDateString(evening)).toBe("2026-07-29");
});

test("pins to UTC midnight so Prisma's date truncation cannot shift it", () => {
  const d = businessToday(new Date("2026-07-28T17:30:00.000Z"));
  expect(d.toISOString()).toBe("2026-07-29T00:00:00.000Z");
});
