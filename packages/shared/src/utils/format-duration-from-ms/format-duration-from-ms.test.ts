import { describe, expect, it } from "vitest";

import { formatDurationFromMs } from "./format-duration-from-ms";

describe("formatDurationFromMs", () => {
  describe("happy path", () => {
    it("should format zero milliseconds", () => {
      expect(formatDurationFromMs(0)).toBe("00:00.0");
    });

    it("should format milliseconds less than 1000", () => {
      expect(formatDurationFromMs(100)).toBe("00:00.1");
      expect(formatDurationFromMs(500)).toBe("00:00.5");
      expect(formatDurationFromMs(999)).toBe("00:00.9");
    });

    it("should format milliseconds with decimals", () => {
      expect(formatDurationFromMs(123.456)).toBe("00:00.1");
      expect(formatDurationFromMs(0.5)).toBe("00:00.0");
    });

    it("should format exactly 1 second", () => {
      expect(formatDurationFromMs(1000)).toBe("00:01.0");
    });

    it("should format seconds less than 60", () => {
      expect(formatDurationFromMs(5000)).toBe("00:05.0");
      expect(formatDurationFromMs(30000)).toBe("00:30.0");
      expect(formatDurationFromMs(59999)).toBe("00:59.9");
    });

    it("should format seconds with decimals", () => {
      expect(formatDurationFromMs(1234.567)).toBe("00:01.2");
      expect(formatDurationFromMs(15000.789)).toBe("00:15.0");
    });

    it("should format exactly 1 minute", () => {
      expect(formatDurationFromMs(60000)).toBe("01:00.0");
    });

    it("should format minutes less than 60", () => {
      expect(formatDurationFromMs(300000)).toBe("05:00.0");
      expect(formatDurationFromMs(1800000)).toBe("30:00.0");
      expect(formatDurationFromMs(3599999)).toBe("59:59.9");
    });

    it("should format minutes with decimals", () => {
      expect(formatDurationFromMs(90000)).toBe("01:30.0");
      expect(formatDurationFromMs(150000)).toBe("02:30.0");
    });

    it("should format exactly 1 hour", () => {
      expect(formatDurationFromMs(3600000)).toBe("01:00:00.0");
    });

    it("should format hours", () => {
      expect(formatDurationFromMs(7200000)).toBe("02:00:00.0");
      expect(formatDurationFromMs(10800000)).toBe("03:00:00.0");
      expect(formatDurationFromMs(86400000)).toBe("24:00:00.0");
    });

    it("should format hours with decimals", () => {
      expect(formatDurationFromMs(5400000)).toBe("01:30:00.0");
      expect(formatDurationFromMs(9000000)).toBe("02:30:00.0");
    });
  });

  describe("error cases", () => {
    it("should throw TypeError for undefined input", () => {
      expect(() => formatDurationFromMs(undefined)).toThrow(TypeError);
    });

    it("should throw TypeError for null input", () => {
      expect(() => formatDurationFromMs(null)).toThrow(TypeError);
    });

    it("should throw TypeError for boolean input", () => {
      // @ts-expect-error - testing invalid input
      expect(() => formatDurationFromMs(true)).toThrow(TypeError);
    });

    it("should throw TypeError for string input", () => {
      // @ts-expect-error - testing invalid input
      expect(() => formatDurationFromMs("123")).toThrow(TypeError);
    });

    it("should throw Error for negative numbers", () => {
      expect(() => formatDurationFromMs(-100)).toThrow(Error);
      expect(() => formatDurationFromMs(-1)).toThrow(Error);
    });

    it("should throw Error for NaN", () => {
      expect(() => formatDurationFromMs(NaN)).toThrow(Error);
    });

    it("should throw Error for Infinity", () => {
      expect(() => formatDurationFromMs(Infinity)).toThrow(Error);
      expect(() => formatDurationFromMs(-Infinity)).toThrow(Error);
    });
  });

  describe("boundary conditions", () => {
    it("should handle boundary between milliseconds and seconds", () => {
      expect(formatDurationFromMs(999)).toBe("00:00.9");
      expect(formatDurationFromMs(999.99)).toBe("00:00.9");
      expect(formatDurationFromMs(1000)).toBe("00:01.0");
    });

    it("should handle boundary between seconds and minutes", () => {
      expect(formatDurationFromMs(59999)).toBe("00:59.9");
      expect(formatDurationFromMs(59999.99)).toBe("00:59.9");
      expect(formatDurationFromMs(60000)).toBe("01:00.0");
    });

    it("should handle boundary between minutes and hours", () => {
      expect(formatDurationFromMs(3599999)).toBe("59:59.9");
      expect(formatDurationFromMs(3599999.99)).toBe("59:59.9");
      expect(formatDurationFromMs(3600000)).toBe("01:00:00.0");
    });

    it("should handle very small values", () => {
      expect(formatDurationFromMs(0.001)).toBe("00:00.0");
      expect(formatDurationFromMs(0.01)).toBe("00:00.0");
      expect(formatDurationFromMs(0.1)).toBe("00:00.0");
      expect(formatDurationFromMs(0.99)).toBe("00:00.0");
    });

    it("should handle values just below unit boundaries", () => {
      // Just below 1 second
      expect(formatDurationFromMs(999.5)).toBe("00:00.9");
      // Just below 1 minute (59.995 seconds)
      expect(formatDurationFromMs(59995)).toBe("00:59.9");
      // Just below 1 hour (59.999 minutes)
      expect(formatDurationFromMs(3599995)).toBe("59:59.9");
    });

    it("should handle values that would round to next unit", () => {
      // 59.995 seconds floors to 59.9
      expect(formatDurationFromMs(59995)).toBe("00:59.9");
      // 59.999 minutes floors to 59.9
      expect(formatDurationFromMs(3599995)).toBe("59:59.9");
    });

    it("should handle very large hour values", () => {
      expect(formatDurationFromMs(36000000)).toBe("10:00:00.0");
      expect(formatDurationFromMs(86400000)).toBe("24:00:00.0");
      expect(formatDurationFromMs(360000000)).toBe("100:00:00.0");
    });

    it("should handle floating point precision edge cases", () => {
      // Values that might have floating point representation issues
      expect(formatDurationFromMs(1000.0000001)).toBe("00:01.0");
      expect(formatDurationFromMs(60000.0000001)).toBe("01:00.0");
      expect(formatDurationFromMs(3600000.0000001)).toBe("01:00:00.0");
    });

    it("should handle decimal precision at boundaries", () => {
      // Test values that require careful rounding/truncation
      expect(formatDurationFromMs(59994.9)).toBe("00:59.9");
      expect(formatDurationFromMs(59995.1)).toBe("00:59.9");
      expect(formatDurationFromMs(3599994.9)).toBe("59:59.9");
      expect(formatDurationFromMs(3599995.1)).toBe("59:59.9");
    });

    it("should handle exact unit multiples", () => {
      expect(formatDurationFromMs(2000)).toBe("00:02.0");
      expect(formatDurationFromMs(120000)).toBe("02:00.0");
      expect(formatDurationFromMs(7200000)).toBe("02:00:00.0");
    });

    it("should handle fractional milliseconds", () => {
      expect(formatDurationFromMs(0.123)).toBe("00:00.0");
      expect(formatDurationFromMs(0.125)).toBe("00:00.0");
      expect(formatDurationFromMs(0.126)).toBe("00:00.0");
    });
  });

  describe("invalid arguments", () => {
    it("should throw TypeError for missing argument", () => {
      // @ts-expect-error - testing missing arg
      expect(() => formatDurationFromMs()).toThrow(TypeError);
    });

    it("should ignore extra parameters", () => {
      // @ts-expect-error - testing extra param
      const result = formatDurationFromMs(1000, "extra");
      expect(result).toBe("00:01.0");
    });
  });
});
