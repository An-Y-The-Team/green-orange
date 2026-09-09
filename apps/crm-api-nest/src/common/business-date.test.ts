import { describe, expect, test } from "bun:test";

import {
  businessDateString,
  businessDayRange,
  businessTimeString,
  businessToday,
} from "./business-date";

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

// The bug this guards: an appointment at 06:30 ICT is stored 23:30Z on the
// PREVIOUS UTC day, so any UTC-prefix comparison drops it from "today" all day.
// The range must start at +07:00 midnight and be exactly 24h wide.
describe("businessDayRange (filtering a timestamp by a local date)", () => {
  test("starts at local midnight, which is 17:00Z the day before", () => {
    const { gte, lt } = businessDayRange("2026-09-07");
    expect(gte.toISOString()).toBe("2026-09-06T17:00:00.000Z");
    expect(lt.toISOString()).toBe("2026-09-07T17:00:00.000Z");
  });

  test("an early-morning local appointment falls INSIDE its own day", () => {
    const { gte, lt } = businessDayRange("2026-07-28");
    // 06:30 on the 28th ICT == 23:30Z on the 27th.
    const earlyMorning = new Date("2026-07-27T23:30:00.000Z");
    expect(earlyMorning >= gte && earlyMorning < lt).toBe(true);
  });

  test("a late-evening local appointment falls inside too, and midnight does not", () => {
    const { lt } = businessDayRange("2026-07-28");
    expect(new Date("2026-07-28T16:59:00.000Z") < lt).toBe(true); // 23:59 ICT
    expect(new Date("2026-07-28T17:00:00.000Z") < lt).toBe(false); // 00:00 next
  });

  test("the range is exactly 24 hours, half-open", () => {
    const { gte, lt } = businessDayRange("2026-01-01");
    expect(lt.getTime() - gte.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

// businessTimeString is the server's clock-in/out stamp. The bug this guards: reading
// the hour in UTC (or with hourCycle h24) put a 00:30 ICT stamp at "17:30" the previous
// day, or wrote "24:30" — which the HH_MM validator on the way back in rejects.
describe("businessTimeString (the stamp for a clock-in/out)", () => {
  test("reads the wall clock in Vietnam, not UTC", () => {
    // 07:30 ICT is 00:30Z the same day.
    expect(businessTimeString(new Date("2026-07-29T00:30:00.000Z"))).toBe(
      "07:30"
    );
  });

  test("just after midnight ICT is 00:mm, never 24:mm", () => {
    // 00:30 on the 29th in Vietnam is 17:30Z on the 28th.
    const justAfterMidnight = new Date("2026-07-28T17:30:00.000Z");
    expect(businessTimeString(justAfterMidnight)).toBe("00:30");
    // …and it belongs to the 29th, so a shift stamped here is dated correctly.
    expect(businessDateString(justAfterMidnight)).toBe("2026-07-29");
  });

  test("always two-digit, so it satisfies the HH_MM validator", () => {
    expect(businessTimeString(new Date("2026-07-29T02:05:00.000Z"))).toBe(
      "09:05"
    );
    expect(businessTimeString(new Date("2026-07-29T16:00:00.000Z"))).toBe(
      "23:00"
    );
  });
});
