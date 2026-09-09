import { expect, test } from "bun:test";

import { formatHours } from "./format-hours";

test("formatHours", () => {
  expect(formatHours({ hours: 8.75 })).toBe("8 giờ 45 phút");
  expect(formatHours({ hours: 9 })).toBe("9 giờ");
  expect(formatHours({ hours: 0.5 })).toBe("30 phút");
  expect(formatHours({ hours: 0 })).toBe("0 phút");
  expect(formatHours({ hours: 4.33 })).toBe("4 giờ 20 phút"); // API rounds to 2dp
  expect(formatHours({ hours: 16 })).toBe("16 giờ");
});
