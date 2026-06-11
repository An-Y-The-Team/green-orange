import { beforeEach, describe, expect, it, vi } from "vitest";

import { TIME_FORMAT } from "../../constants";
import {
  formatDate,
  formatDateDMYHMS,
  formatDateISO,
  formatDateShort,
  formatDateWithTimezone,
  formatDateYMD,
  isValidDateInput,
} from "./date";

const { mockFormat, mockTz, mockDayjs } = vi.hoisted(() => {
  const mockFormat = vi.fn();
  const mockTz = vi.fn();
  const mockDayjs = vi.fn();

  mockTz.mockReturnValue({
    format: mockFormat,
  });

  mockDayjs.mockReturnValue({
    format: mockFormat,
    tz: mockTz,
  });

  return {
    mockFormat,
    mockTz,
    mockDayjs,
  };
});

vi.mock("../../lib/dayjs", () => ({
  default: mockDayjs,
}));

describe("isValidDateInput", () => {
  describe("happy path", () => {
    it("should return true for valid Date object", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      expect(isValidDateInput(date)).toBe(true);
    });

    it("should return true for valid date string", () => {
      expect(isValidDateInput("2024-12-15T10:30:00Z")).toBe(true);
    });

    it("should return true for ISO date string", () => {
      expect(isValidDateInput("2024-12-15")).toBe(true);
    });

    it("should return true for date string with time", () => {
      expect(isValidDateInput("2024-12-15T10:30:00")).toBe(true);
    });
  });

  describe("error cases - invalid types", () => {
    it("should return false for undefined", () => {
      expect(isValidDateInput(undefined)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isValidDateInput(null as unknown as Date)).toBe(false);
    });

    it("should return false for number", () => {
      expect(isValidDateInput(123 as unknown as Date)).toBe(false);
    });

    it("should return false for boolean", () => {
      expect(isValidDateInput(true as unknown as Date)).toBe(false);
    });

    it("should return false for object", () => {
      expect(isValidDateInput({} as unknown as Date)).toBe(false);
    });

    it("should return false for array", () => {
      expect(isValidDateInput([1, 2, 3] as unknown as Date)).toBe(false);
    });

    it("should return false for function", () => {
      const fn = () => {};
      expect(isValidDateInput(fn as unknown as Date)).toBe(false);
    });

    it("should return false for NaN", () => {
      expect(isValidDateInput(NaN as unknown as Date)).toBe(false);
    });

    it("should return false for Symbol", () => {
      expect(isValidDateInput(Symbol("test") as unknown as Date)).toBe(false);
    });

    it("should return false for BigInt", () => {
      expect(isValidDateInput(BigInt(123) as unknown as Date)).toBe(false);
    });
  });

  describe("boundary conditions", () => {
    it("should return false for empty string", () => {
      expect(isValidDateInput("")).toBe(false);
    });

    it("should return false for whitespace-only string", () => {
      expect(isValidDateInput("   ")).toBe(false);
    });

    it("should return true for string with leading/trailing whitespace", () => {
      expect(isValidDateInput("  2024-12-15  ")).toBe(true);
    });

    it("should return true for extremely long valid date string", () => {
      const longString = "2024-12-15T10:30:00Z" + "0".repeat(1000);
      expect(isValidDateInput(longString)).toBe(true);
    });
  });

  describe("invalid arguments", () => {
    it("should handle missing parameter", () => {
      expect((isValidDateInput as unknown as () => boolean)()).toBe(false);
    });

    it("should handle extra parameters gracefully", () => {
      expect(
        (
          isValidDateInput as unknown as (
            date: Date | string | undefined,
            extra: string
          ) => boolean
        )(new Date(), "extra")
      ).toBe(true);
    });
  });
});

describe("formatDate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTz.mockReturnValue({
      format: mockFormat,
    });
    mockDayjs.mockReturnValue({
      format: mockFormat,
      tz: mockTz,
    });
  });

  describe("happy path", () => {
    it("should format a Date object without time", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      mockFormat.mockReturnValue("Sunday, December 15, 2024");

      const result = formatDate(date);

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(mockFormat).toHaveBeenCalledWith("dddd, MMMM D, YYYY");
      expect(result).toBe("Sunday, December 15, 2024");
    });

    it("should format a date string without time", () => {
      const dateString = "2024-12-15T10:30:00Z";
      mockFormat.mockReturnValue("Sunday, December 15, 2024");

      const result = formatDate(dateString);

      expect(mockDayjs).toHaveBeenCalledWith(dateString);
      expect(mockFormat).toHaveBeenCalledWith("dddd, MMMM D, YYYY");
      expect(result).toBe("Sunday, December 15, 2024");
    });

    it("should format a Date object with time when includeTime is true", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      mockFormat.mockReturnValue("Sunday, December 15, 2024 at 10:30 AM UTC");

      const result = formatDate(date, true);

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(mockFormat).toHaveBeenCalledWith(
        "dddd, MMMM D, YYYY [at] h:mm A z"
      );
      expect(result).toBe("Sunday, December 15, 2024 at 10:30 AM UTC");
    });

    it("should format a date string with time when includeTime is true", () => {
      const dateString = "2024-12-15T10:30:00Z";
      mockFormat.mockReturnValue("Sunday, December 15, 2024 at 10:30 AM UTC");

      const result = formatDate(dateString, true);

      expect(mockDayjs).toHaveBeenCalledWith(dateString);
      expect(mockFormat).toHaveBeenCalledWith(
        "dddd, MMMM D, YYYY [at] h:mm A z"
      );
      expect(result).toBe("Sunday, December 15, 2024 at 10:30 AM UTC");
    });

    it("should format without time when includeTime is false", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      mockFormat.mockReturnValue("Sunday, December 15, 2024");

      const result = formatDate(date, false);

      expect(mockFormat).toHaveBeenCalledWith("dddd, MMMM D, YYYY");
      expect(result).toBe("Sunday, December 15, 2024");
    });

    it("should format without time when includeTime is undefined", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      mockFormat.mockReturnValue("Sunday, December 15, 2024");

      const result = formatDate(date);

      expect(mockFormat).toHaveBeenCalledWith("dddd, MMMM D, YYYY");
      expect(result).toBe("Sunday, December 15, 2024");
    });
  });

  describe("error cases - invalid types", () => {
    it("should return 'N/A' for undefined", () => {
      expect(formatDate(undefined as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for null", () => {
      expect(formatDate(null as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for number", () => {
      expect(formatDate(123 as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for boolean", () => {
      expect(formatDate(true as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for object", () => {
      expect(formatDate({} as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for array", () => {
      expect(formatDate([1, 2, 3] as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for function", () => {
      const fn = () => {};
      expect(formatDate(fn as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for NaN", () => {
      expect(formatDate(NaN as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for Symbol", () => {
      expect(formatDate(Symbol("test") as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for BigInt", () => {
      expect(formatDate(BigInt(123) as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });
  });

  describe("boundary conditions", () => {
    it("should return 'N/A' for empty string", () => {
      expect(formatDate("")).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for whitespace-only string", () => {
      expect(formatDate("   ")).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should handle invalid date strings gracefully", () => {
      const invalidDate = "not-a-date";
      mockFormat.mockReturnValue("Invalid Date");

      const result = formatDate(invalidDate);

      expect(mockDayjs).toHaveBeenCalledWith(invalidDate);
      expect(result).toBe("Invalid Date");
    });

    it("should handle year boundary dates", () => {
      const date = new Date("2023-12-31T23:59:59Z");
      mockFormat.mockReturnValue("Sunday, December 31, 2023");

      const result = formatDate(date);

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(result).toBe("Sunday, December 31, 2023");
    });

    it("should handle leap year dates", () => {
      const date = new Date("2024-02-29T12:00:00Z");
      mockFormat.mockReturnValue("Thursday, February 29, 2024");

      const result = formatDate(date);

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(result).toBe("Thursday, February 29, 2024");
    });

    it("should handle old dates", () => {
      const date = new Date("1999-02-15T00:00:00Z");
      mockFormat.mockReturnValue("Monday, February 15, 1999");

      const result = formatDate(date);

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(result).toBe("Monday, February 15, 1999");
    });

    it("should handle future dates", () => {
      const date = new Date("2099-12-31T23:59:59Z");
      mockFormat.mockReturnValue("Thursday, December 31, 2099");

      const result = formatDate(date);

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(result).toBe("Thursday, December 31, 2099");
    });

    it("should handle extremely long date string", () => {
      const longString = "2024-12-15T10:30:00Z" + "0".repeat(1000);
      mockFormat.mockReturnValue("Formatted date");

      const result = formatDate(longString);

      expect(mockDayjs).toHaveBeenCalledWith(longString);
      expect(result).toBe("Formatted date");
    });

    it("should handle nested object as date", () => {
      const nestedObj = { date: { value: "2024-12-15" } };
      expect(formatDate(nestedObj as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should handle deep array as date", () => {
      const deepArray = [[[[["2024-12-15"]]]]];
      expect(formatDate(deepArray as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });
  });

  describe("invalid arguments", () => {
    it("should handle missing date parameter", () => {
      expect((formatDate as unknown as () => string)()).toBe("N/A");
    });

    it("should handle extra parameters gracefully", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      mockFormat.mockReturnValue("Sunday, December 15, 2024");

      const result = (
        formatDate as unknown as (
          date: Date | string,
          includeTime: boolean,
          extra: string
        ) => string
      )(date, false, "extra");

      expect(result).toBe("Sunday, December 15, 2024");
    });

    it("should handle includeTime as number", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      mockFormat.mockReturnValue("Sunday, December 15, 2024 at 10:30 AM UTC");

      const result = formatDate(date, 1 as unknown as boolean);

      expect(mockFormat).toHaveBeenCalledWith(
        "dddd, MMMM D, YYYY [at] h:mm A z"
      );
      expect(result).toBe("Sunday, December 15, 2024 at 10:30 AM UTC");
    });

    it("should handle includeTime as string", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      mockFormat.mockReturnValue("Sunday, December 15, 2024");

      const result = formatDate(date, "true" as unknown as boolean);

      expect(result).toBe("Sunday, December 15, 2024");
    });
  });
});

describe("formatDateShort", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTz.mockReturnValue({
      format: mockFormat,
    });
    mockDayjs.mockReturnValue({
      format: mockFormat,
      tz: mockTz,
    });
  });

  describe("happy path", () => {
    it("should format a Date object to short format", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      mockFormat.mockReturnValue("Dec 15");

      const result = formatDateShort(date);

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(mockFormat).toHaveBeenCalledWith("MMM D");
      expect(result).toBe("Dec 15");
    });

    it("should format a date string to short format", () => {
      const dateString = "2024-12-15T10:30:00Z";
      mockFormat.mockReturnValue("Dec 15");

      const result = formatDateShort(dateString);

      expect(mockDayjs).toHaveBeenCalledWith(dateString);
      expect(mockFormat).toHaveBeenCalledWith("MMM D");
      expect(result).toBe("Dec 15");
    });
  });

  describe("error cases - invalid types", () => {
    it("should return 'N/A' for undefined", () => {
      expect(formatDateShort(undefined as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for null", () => {
      expect(formatDateShort(null as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for number", () => {
      expect(formatDateShort(123 as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for boolean", () => {
      expect(formatDateShort(true as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for object", () => {
      expect(formatDateShort({} as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for array", () => {
      expect(formatDateShort([1, 2, 3] as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for function", () => {
      const fn = () => {};
      expect(formatDateShort(fn as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for NaN", () => {
      expect(formatDateShort(NaN as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for Symbol", () => {
      expect(formatDateShort(Symbol("test") as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for BigInt", () => {
      expect(formatDateShort(BigInt(123) as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });
  });

  describe("boundary conditions", () => {
    it("should return 'N/A' for empty string", () => {
      expect(formatDateShort("")).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for whitespace-only string", () => {
      expect(formatDateShort("   ")).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should handle invalid date strings", () => {
      const invalidDate = "not-a-date";
      mockFormat.mockReturnValue("Invalid Date");

      const result = formatDateShort(invalidDate);

      expect(mockDayjs).toHaveBeenCalledWith(invalidDate);
      expect(result).toBe("Invalid Date");
    });

    it("should handle extremely long date string", () => {
      const longString = "2024-12-15T10:30:00Z" + "0".repeat(1000);
      mockFormat.mockReturnValue("Dec 15");

      const result = formatDateShort(longString);

      expect(mockDayjs).toHaveBeenCalledWith(longString);
      expect(result).toBe("Dec 15");
    });

    it("should handle nested object as date", () => {
      const nestedObj = { date: { value: "2024-12-15" } };
      expect(formatDateShort(nestedObj as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should handle deep array as date", () => {
      const deepArray = [[[[["2024-12-15"]]]]];
      expect(formatDateShort(deepArray as unknown as Date)).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });
  });

  describe("invalid arguments", () => {
    it("should handle missing date parameter", () => {
      expect((formatDateShort as unknown as () => string)()).toBe("N/A");
    });

    it("should handle extra parameters gracefully", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      mockFormat.mockReturnValue("Dec 15");

      const result = (
        formatDateShort as unknown as (
          date: Date | string,
          extra: string
        ) => string
      )(date, "extra");

      expect(result).toBe("Dec 15");
    });
  });
});

describe("formatDateWithTimezone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTz.mockReturnValue({
      format: mockFormat,
    });
    mockDayjs.mockReturnValue({
      format: mockFormat,
      tz: mockTz,
    });
  });

  describe("happy path", () => {
    it("should format a Date object with timezone using 12-hour format", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      const timezone = "America/New_York";
      mockFormat.mockReturnValue("Sunday, December 15, 2024 at 5:30 AM EST");

      const result = formatDateWithTimezone(date, timezone);

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(mockTz).toHaveBeenCalledWith(timezone);
      expect(mockFormat).toHaveBeenCalledWith(
        "dddd, MMMM D, YYYY [at] h:mm A z"
      );
      expect(result).toBe("Sunday, December 15, 2024 at 5:30 AM EST");
    });

    it("should format a date string with timezone using 12-hour format", () => {
      const dateString = "2024-12-15T10:30:00Z";
      const timezone = "America/New_York";
      mockFormat.mockReturnValue("Sunday, December 15, 2024 at 5:30 AM EST");

      const result = formatDateWithTimezone(dateString, timezone);

      expect(mockDayjs).toHaveBeenCalledWith(dateString);
      expect(mockTz).toHaveBeenCalledWith(timezone);
      expect(result).toBe("Sunday, December 15, 2024 at 5:30 AM EST");
    });

    it("should format with 24-hour format when specified", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      const timezone = "Europe/London";
      mockFormat.mockReturnValue("Sunday, December 15, 2024 at 10:30 GMT");

      const result = formatDateWithTimezone(
        date,
        timezone,
        TIME_FORMAT.TWENTY_FOUR_HOUR
      );

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(mockTz).toHaveBeenCalledWith(timezone);
      expect(mockFormat).toHaveBeenCalledWith("dddd, MMMM D, YYYY [at] H:mm z");
      expect(result).toBe("Sunday, December 15, 2024 at 10:30 GMT");
    });

    it("should format with 12-hour format when TWELVE_HOUR is specified", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      const timezone = "America/New_York";
      mockFormat.mockReturnValue("Sunday, December 15, 2024 at 5:30 AM EST");

      const result = formatDateWithTimezone(
        date,
        timezone,
        TIME_FORMAT.TWELVE_HOUR
      );

      expect(mockFormat).toHaveBeenCalledWith(
        "dddd, MMMM D, YYYY [at] h:mm A z"
      );
      expect(result).toBe("Sunday, December 15, 2024 at 5:30 AM EST");
    });

    it("should format without minutes when TWELVE_HOUR_NO_MINUTES is specified", () => {
      const date = new Date("2024-12-15T10:00:00Z");
      const timezone = "America/New_York";
      mockFormat.mockReturnValue("Sunday, December 15, 2024 at 5 AM EST");

      const result = formatDateWithTimezone(
        date,
        timezone,
        TIME_FORMAT.TWELVE_HOUR_NO_MINUTES
      );

      expect(mockFormat).toHaveBeenCalledWith("dddd, MMMM D, YYYY [at] h A z");
      expect(result).toBe("Sunday, December 15, 2024 at 5 AM EST");
    });

    it("should format without format parameter defaulting to 12-hour", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      const timezone = "America/New_York";
      mockFormat.mockReturnValue("Sunday, December 15, 2024 at 5:30 AM EST");

      const result = formatDateWithTimezone(date, timezone);

      expect(mockFormat).toHaveBeenCalledWith(
        "dddd, MMMM D, YYYY [at] h:mm A z"
      );
      expect(result).toBe("Sunday, December 15, 2024 at 5:30 AM EST");
    });

    it("should handle various timezone formats", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      const timezones = [
        "America/New_York",
        "Europe/London",
        "Asia/Tokyo",
        "Australia/Sydney",
        "UTC",
      ];

      timezones.forEach((tz) => {
        mockFormat.mockReturnValue(`Formatted with ${tz}`);
        mockTz.mockReturnValue({ format: mockFormat });

        const result = formatDateWithTimezone(date, tz);

        expect(mockTz).toHaveBeenCalledWith(tz);
        expect(result).toBe(`Formatted with ${tz}`);
      });
    });
  });

  describe("error cases - invalid types", () => {
    it("should return 'N/A' for undefined date", () => {
      const result = formatDateWithTimezone(
        undefined as unknown as Date,
        "America/New_York"
      );

      expect(result).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for null date", () => {
      const result = formatDateWithTimezone(
        null as unknown as Date,
        "America/New_York"
      );

      expect(result).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for number date", () => {
      const result = formatDateWithTimezone(
        123 as unknown as Date,
        "America/New_York"
      );

      expect(result).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for boolean date", () => {
      const result = formatDateWithTimezone(
        true as unknown as Date,
        "America/New_York"
      );

      expect(result).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for object date", () => {
      const result = formatDateWithTimezone(
        {} as unknown as Date,
        "America/New_York"
      );

      expect(result).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for array date", () => {
      const result = formatDateWithTimezone(
        [1, 2, 3] as unknown as Date,
        "America/New_York"
      );

      expect(result).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for function date", () => {
      const fn = () => {};
      const result = formatDateWithTimezone(
        fn as unknown as Date,
        "America/New_York"
      );

      expect(result).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for NaN date", () => {
      const result = formatDateWithTimezone(
        NaN as unknown as Date,
        "America/New_York"
      );

      expect(result).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for Symbol date", () => {
      const result = formatDateWithTimezone(
        Symbol("test") as unknown as Date,
        "America/New_York"
      );

      expect(result).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for BigInt date", () => {
      const result = formatDateWithTimezone(
        BigInt(123) as unknown as Date,
        "America/New_York"
      );

      expect(result).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });
  });

  describe("boundary conditions", () => {
    it("should return 'N/A' for empty string date", () => {
      const result = formatDateWithTimezone("", "America/New_York");

      expect(result).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return 'N/A' for whitespace-only string date", () => {
      const result = formatDateWithTimezone("   ", "America/New_York");

      expect(result).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should fallback to formatDate when timezone is invalid", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      const invalidTimezone = "Invalid/Timezone";
      mockTz.mockImplementation(() => {
        throw new Error("Invalid timezone");
      });
      mockFormat.mockReturnValue("Sunday, December 15, 2024 at 10:30 AM UTC");

      const result = formatDateWithTimezone(date, invalidTimezone);

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(mockFormat).toHaveBeenCalledWith(
        "dddd, MMMM D, YYYY [at] h:mm A z"
      );
      expect(result).toBe("Sunday, December 15, 2024 at 10:30 AM UTC");
    });

    it("should handle empty timezone string", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      mockTz.mockImplementation(() => {
        throw new Error("Invalid timezone");
      });
      mockFormat.mockReturnValue("Sunday, December 15, 2024 at 10:30 AM UTC");

      const result = formatDateWithTimezone(date, "");

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(result).toBe("Sunday, December 15, 2024 at 10:30 AM UTC");
    });

    it("should handle null timezone", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      mockTz.mockImplementation(() => {
        throw new Error("Invalid timezone");
      });
      mockFormat.mockReturnValue("Sunday, December 15, 2024 at 10:30 AM UTC");

      const result = formatDateWithTimezone(date, null as unknown as string);

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(result).toBe("Sunday, December 15, 2024 at 10:30 AM UTC");
    });

    it("should handle invalid date strings with valid timezone", () => {
      const invalidDate = "not-a-date";
      const timezone = "America/New_York";
      mockFormat.mockReturnValue("Invalid Date");

      const result = formatDateWithTimezone(invalidDate, timezone);

      expect(mockDayjs).toHaveBeenCalledWith(invalidDate);
      expect(result).toBe("Invalid Date");
    });

    it("should handle extremely long date string", () => {
      const longString = "2024-12-15T10:30:00Z" + "0".repeat(1000);
      const timezone = "America/New_York";
      mockFormat.mockReturnValue("Formatted date");

      const result = formatDateWithTimezone(longString, timezone);

      expect(mockDayjs).toHaveBeenCalledWith(longString);
      expect(result).toBe("Formatted date");
    });

    it("should handle extremely long timezone string", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      const longTimezone = "America/New_York" + "0".repeat(1000);
      mockTz.mockImplementation(() => {
        throw new Error("Invalid timezone");
      });
      mockFormat.mockReturnValue("Sunday, December 15, 2024 at 10:30 AM UTC");

      const result = formatDateWithTimezone(date, longTimezone);

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(result).toBe("Sunday, December 15, 2024 at 10:30 AM UTC");
    });

    it("should handle nested object as date", () => {
      const nestedObj = { date: { value: "2024-12-15" } };
      const result = formatDateWithTimezone(
        nestedObj as unknown as Date,
        "America/New_York"
      );

      expect(result).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should handle deep array as date", () => {
      const deepArray = [[[[["2024-12-15"]]]]];
      const result = formatDateWithTimezone(
        deepArray as unknown as Date,
        "America/New_York"
      );

      expect(result).toBe("N/A");
      expect(mockDayjs).not.toHaveBeenCalled();
    });
  });

  describe("invalid arguments", () => {
    it("should handle missing date parameter", () => {
      const result = (
        formatDateWithTimezone as unknown as (
          date: Date | string,
          timezone: string
        ) => string
      )(undefined as unknown as Date, "America/New_York");

      expect(result).toBe("N/A");
    });

    it("should handle missing timezone parameter", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      mockTz.mockImplementation(() => {
        throw new Error("Invalid timezone");
      });
      mockFormat.mockReturnValue("Sunday, December 15, 2024 at 10:30 AM UTC");

      const result = (
        formatDateWithTimezone as unknown as (
          date: Date | string,
          timezone: string
        ) => string
      )(date, undefined as unknown as string);

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(result).toBe("Sunday, December 15, 2024 at 10:30 AM UTC");
    });

    it("should handle extra parameters gracefully", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      const timezone = "America/New_York";
      mockFormat.mockReturnValue("Sunday, December 15, 2024 at 5:30 AM EST");

      const result = (
        formatDateWithTimezone as unknown as (
          date: Date | string,
          timezone: string,
          format: (typeof TIME_FORMAT)[keyof typeof TIME_FORMAT] | undefined,
          extra: string
        ) => string
      )(date, timezone, undefined, "extra");

      expect(result).toBe("Sunday, December 15, 2024 at 5:30 AM EST");
    });

    it("should handle format as number", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      const timezone = "America/New_York";
      mockFormat.mockReturnValue("Sunday, December 15, 2024");

      const result = formatDateWithTimezone(
        date,
        timezone,
        24 as unknown as (typeof TIME_FORMAT)[keyof typeof TIME_FORMAT]
      );

      expect(mockFormat).toHaveBeenCalledWith(
        "dddd, MMMM D, YYYY [at] h:mm A z"
      );
      expect(result).toBe("Sunday, December 15, 2024");
    });

    it("should handle format as string", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      const timezone = "America/New_York";
      mockFormat.mockReturnValue("Sunday, December 15, 2024");

      const result = formatDateWithTimezone(
        date,
        timezone,
        "24h" as unknown as (typeof TIME_FORMAT)[keyof typeof TIME_FORMAT]
      );
      expect(result).toBe("Sunday, December 15, 2024");
    });

    it("should handle timezone as number", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      mockTz.mockImplementation(() => {
        throw new Error("Invalid timezone");
      });
      mockFormat.mockReturnValue("Sunday, December 15, 2024 at 10:30 AM UTC");

      const result = formatDateWithTimezone(
        date,
        123 as unknown as string,
        undefined
      );

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(result).toBe("Sunday, December 15, 2024 at 10:30 AM UTC");
    });

    it("should handle timezone as object", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      mockTz.mockImplementation(() => {
        throw new Error("Invalid timezone");
      });
      mockFormat.mockReturnValue("Sunday, December 15, 2024 at 10:30 AM UTC");

      const result = formatDateWithTimezone(
        date,
        {} as unknown as string,
        undefined
      );

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(result).toBe("Sunday, December 15, 2024 at 10:30 AM UTC");
    });

    it("should handle timezone as array", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      mockTz.mockImplementation(() => {
        throw new Error("Invalid timezone");
      });
      mockFormat.mockReturnValue("Sunday, December 15, 2024 at 10:30 AM UTC");

      const result = formatDateWithTimezone(
        date,
        ["America", "New_York"] as unknown as string,
        undefined
      );

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(result).toBe("Sunday, December 15, 2024 at 10:30 AM UTC");
    });
  });
});

describe("formatDateYMD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTz.mockReturnValue({
      format: mockFormat,
    });
    mockDayjs.mockReturnValue({
      format: mockFormat,
      tz: mockTz,
    });
  });

  describe("happy path", () => {
    it("should format a Date object to YYYY-MM-DD", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      mockFormat.mockReturnValue("2024-12-15");

      const result = formatDateYMD(date);

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(mockFormat).toHaveBeenCalledWith("YYYY-MM-DD");
      expect(result).toBe("2024-12-15");
    });

    it("should format a date string to YYYY-MM-DD", () => {
      const dateString = "2024-12-15T10:30:00Z";
      mockFormat.mockReturnValue("2024-12-15");

      const result = formatDateYMD(dateString);

      expect(mockDayjs).toHaveBeenCalledWith(dateString);
      expect(mockFormat).toHaveBeenCalledWith("YYYY-MM-DD");
      expect(result).toBe("2024-12-15");
    });

    it("should format undefined to empty string", () => {
      expect(formatDateYMD(undefined)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });
  });

  describe("error cases - invalid types", () => {
    it("should return empty string for null", () => {
      expect(formatDateYMD(null as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return empty string for number", () => {
      expect(formatDateYMD(123 as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return empty string for boolean", () => {
      expect(formatDateYMD(true as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return empty string for object", () => {
      expect(formatDateYMD({} as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return empty string for array", () => {
      expect(formatDateYMD([1, 2, 3] as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return empty string for function", () => {
      const fn = () => {};
      expect(formatDateYMD(fn as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return empty string for NaN", () => {
      expect(formatDateYMD(NaN as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return empty string for Symbol", () => {
      expect(formatDateYMD(Symbol("test") as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return empty string for BigInt", () => {
      expect(formatDateYMD(BigInt(123) as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });
  });

  describe("boundary conditions", () => {
    it("should return empty string for empty string", () => {
      expect(formatDateYMD("")).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return empty string for whitespace-only string", () => {
      expect(formatDateYMD("   ")).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should handle invalid date strings", () => {
      const invalidDate = "not-a-date";
      mockFormat.mockReturnValue("Invalid Date");

      const result = formatDateYMD(invalidDate);

      expect(mockDayjs).toHaveBeenCalledWith(invalidDate);
      expect(result).toBe("Invalid Date");
    });

    it("should handle extremely long date string", () => {
      const longString = "2024-12-15T10:30:00Z" + "0".repeat(1000);
      mockFormat.mockReturnValue("2024-12-15");

      const result = formatDateYMD(longString);

      expect(mockDayjs).toHaveBeenCalledWith(longString);
      expect(result).toBe("2024-12-15");
    });

    it("should handle nested object as date", () => {
      const nestedObj = { date: { value: "2024-12-15" } };
      expect(formatDateYMD(nestedObj as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should handle deep array as date", () => {
      const deepArray = [[[[["2024-12-15"]]]]];
      expect(formatDateYMD(deepArray as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });
  });

  describe("invalid arguments", () => {
    it("should handle missing date parameter", () => {
      expect((formatDateYMD as unknown as () => string)()).toBe("");
    });

    it("should handle extra parameters gracefully", () => {
      const date = new Date("2024-12-15T10:30:00Z");
      mockFormat.mockReturnValue("2024-12-15");

      const result = (
        formatDateYMD as unknown as (
          date: Date | string | undefined,
          extra: string
        ) => string
      )(date, "extra");

      expect(result).toBe("2024-12-15");
    });
  });
});

describe("formatDateDMYHMS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTz.mockReturnValue({
      format: mockFormat,
    });
    mockDayjs.mockReturnValue({
      format: mockFormat,
      tz: mockTz,
    });
  });

  describe("happy path", () => {
    it("should format a Date object to DD/MM/YYYY - HH:mm:ss", () => {
      const date = new Date("2024-12-15T10:30:45Z");
      mockFormat.mockReturnValue("15/12/2024 - 10:30:45");

      const result = formatDateDMYHMS(date);

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(mockFormat).toHaveBeenCalledWith("DD/MM/YYYY - HH:mm:ss");
      expect(result).toBe("15/12/2024 - 10:30:45");
    });

    it("should format a date string to DD/MM/YYYY - HH:mm:ss", () => {
      const dateString = "2024-12-15T10:30:45Z";
      mockFormat.mockReturnValue("15/12/2024 - 10:30:45");

      const result = formatDateDMYHMS(dateString);

      expect(mockDayjs).toHaveBeenCalledWith(dateString);
      expect(mockFormat).toHaveBeenCalledWith("DD/MM/YYYY - HH:mm:ss");
      expect(result).toBe("15/12/2024 - 10:30:45");
    });

    it("should handle single digit values with padding", () => {
      const date = new Date("2024-01-05T05:03:02Z");
      mockFormat.mockReturnValue("05/01/2024 - 05:03:02");

      const result = formatDateDMYHMS(date);

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(result).toBe("05/01/2024 - 05:03:02");
    });

    it("should handle midnight", () => {
      const date = new Date("2024-12-15T00:00:00Z");
      mockFormat.mockReturnValue("15/12/2024 - 00:00:00");

      const result = formatDateDMYHMS(date);

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(result).toBe("15/12/2024 - 00:00:00");
    });

    it("should handle end of day", () => {
      const date = new Date("2024-12-15T23:59:59Z");
      mockFormat.mockReturnValue("15/12/2024 - 23:59:59");

      const result = formatDateDMYHMS(date);

      expect(mockDayjs).toHaveBeenCalledWith(date);
      expect(result).toBe("15/12/2024 - 23:59:59");
    });
  });

  describe("error cases - invalid types", () => {
    it("should return empty string for undefined", () => {
      expect(formatDateDMYHMS(undefined as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return empty string for null", () => {
      expect(formatDateDMYHMS(null as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return empty string for number", () => {
      expect(formatDateDMYHMS(123 as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return empty string for boolean", () => {
      expect(formatDateDMYHMS(true as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return empty string for object", () => {
      expect(formatDateDMYHMS({} as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return empty string for array", () => {
      expect(formatDateDMYHMS([1, 2, 3] as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return empty string for function", () => {
      const fn = () => {};
      expect(formatDateDMYHMS(fn as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return empty string for NaN", () => {
      expect(formatDateDMYHMS(NaN as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return empty string for Symbol", () => {
      expect(formatDateDMYHMS(Symbol("test") as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return empty string for BigInt", () => {
      expect(formatDateDMYHMS(BigInt(123) as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });
  });

  describe("boundary conditions", () => {
    it("should return empty string for empty string", () => {
      expect(formatDateDMYHMS("")).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should return empty string for whitespace-only string", () => {
      expect(formatDateDMYHMS("   ")).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should handle invalid date strings", () => {
      const invalidDate = "not-a-date";
      mockFormat.mockReturnValue("Invalid Date");

      const result = formatDateDMYHMS(invalidDate);

      expect(mockDayjs).toHaveBeenCalledWith(invalidDate);
      expect(result).toBe("Invalid Date");
    });

    it("should handle extremely long date string", () => {
      const longString = "2024-12-15T10:30:00Z" + "0".repeat(1000);
      mockFormat.mockReturnValue("15/12/2024 - 10:30:45");

      const result = formatDateDMYHMS(longString);

      expect(mockDayjs).toHaveBeenCalledWith(longString);
      expect(result).toBe("15/12/2024 - 10:30:45");
    });

    it("should handle nested object as date", () => {
      const nestedObj = { date: { value: "2024-12-15" } };
      expect(formatDateDMYHMS(nestedObj as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });

    it("should handle deep array as date", () => {
      const deepArray = [[[[["2024-12-15"]]]]];
      expect(formatDateDMYHMS(deepArray as unknown as Date)).toBe("");
      expect(mockDayjs).not.toHaveBeenCalled();
    });
  });

  describe("invalid arguments", () => {
    it("should handle missing date parameter", () => {
      expect((formatDateDMYHMS as unknown as () => string)()).toBe("");
    });

    it("should handle extra parameters gracefully", () => {
      const date = new Date("2024-12-15T10:30:45Z");
      mockFormat.mockReturnValue("15/12/2024 - 10:30:45");

      const result = (
        formatDateDMYHMS as unknown as (
          date: Date | string,
          extra: string
        ) => string
      )(date, "extra");

      expect(result).toBe("15/12/2024 - 10:30:45");
    });
  });
});

describe("formatDateISO", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("happy path", () => {
    it("should format a Date object to ISO string", () => {
      const date = new Date("2024-12-15T10:30:45.123Z");
      const expectedISO = "2024-12-15T10:30:45.123Z";

      const result = formatDateISO(date);

      expect(result).toBe(expectedISO);
    });

    it("should format a date string to ISO string", () => {
      const dateString = "2024-12-15T10:30:45.123Z";
      const expectedISO = "2024-12-15T10:30:45.123Z";

      const result = formatDateISO(dateString);

      expect(result).toBe(expectedISO);
    });

    it("should handle various date string formats", () => {
      const testCases = [
        { input: "2024-12-15", expected: "2024-12-15T00:00:00.000Z" },
        { input: "2024-12-15T10:30:45Z", expected: "2024-12-15T10:30:45.000Z" },
        {
          input: "2024-12-15T10:30:45.123Z",
          expected: "2024-12-15T10:30:45.123Z",
        },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = formatDateISO(input);
        expect(result).toBe(expected);
      });
    });

    it("should preserve milliseconds in ISO string", () => {
      const date = new Date("2024-12-15T10:30:45.789Z");
      const expectedISO = "2024-12-15T10:30:45.789Z";

      const result = formatDateISO(date);

      expect(result).toBe(expectedISO);
    });

    it("should handle dates with timezone offsets", () => {
      const dateString = "2024-12-15T10:30:45+05:00";
      const date = new Date(dateString);
      const expectedISO = date.toISOString();

      const result = formatDateISO(dateString);

      expect(result).toBe(expectedISO);
    });

    it("should handle very old dates", () => {
      const date = new Date("1900-01-01T00:00:00.000Z");
      const expectedISO = "1900-01-01T00:00:00.000Z";

      const result = formatDateISO(date);

      expect(result).toBe(expectedISO);
    });

    it("should handle future dates", () => {
      const date = new Date("2099-12-31T23:59:59.999Z");
      const expectedISO = "2099-12-31T23:59:59.999Z";

      const result = formatDateISO(date);

      expect(result).toBe(expectedISO);
    });
  });

  describe("error cases - invalid types", () => {
    it("should return undefined for null", () => {
      expect(formatDateISO(null as unknown as Date)).toBeUndefined();
    });

    it("should return undefined for number", () => {
      expect(formatDateISO(123 as unknown as Date)).toBeUndefined();
    });

    it("should return undefined for boolean", () => {
      expect(formatDateISO(true as unknown as Date)).toBeUndefined();
    });

    it("should return undefined for object", () => {
      expect(formatDateISO({} as unknown as Date)).toBeUndefined();
    });

    it("should return undefined for array", () => {
      expect(formatDateISO([1, 2, 3] as unknown as Date)).toBeUndefined();
    });

    it("should return undefined for function", () => {
      const fn = () => {};
      expect(formatDateISO(fn as unknown as Date)).toBeUndefined();
    });

    it("should return undefined for NaN", () => {
      expect(formatDateISO(NaN as unknown as Date)).toBeUndefined();
    });

    it("should return undefined for Symbol", () => {
      expect(formatDateISO(Symbol("test") as unknown as Date)).toBeUndefined();
    });

    it("should return undefined for BigInt", () => {
      expect(formatDateISO(BigInt(123) as unknown as Date)).toBeUndefined();
    });
  });

  describe("boundary conditions", () => {
    it("should return undefined for empty string", () => {
      expect(formatDateISO("")).toBeUndefined();
    });

    it("should return undefined for whitespace-only string", () => {
      expect(formatDateISO("   ")).toBeUndefined();
    });

    it("should handle invalid date strings", () => {
      const invalidDate = "not-a-date";

      expect(formatDateISO(invalidDate)).toBeUndefined();
    });

    it("should handle extremely long date string", () => {
      const longString = "2024-12-15T10:30:45.123Z" + "0".repeat(10000);
      const result = formatDateISO(longString);

      expect(result).toBeUndefined();
    });

    it("should handle nested object as date", () => {
      const nestedObj = { date: { value: "2024-12-15" } };
      expect(formatDateISO(nestedObj as unknown as Date)).toBeUndefined();
    });

    it("should handle deep array as date", () => {
      const deepArray = [[[[["2024-12-15"]]]]];
      expect(formatDateISO(deepArray as unknown as Date)).toBeUndefined();
    });

    it("should handle circular reference attempt", () => {
      interface CircularObj {
        self?: CircularObj;
      }
      const obj: CircularObj = {};
      obj.self = obj;
      expect(formatDateISO(obj as unknown as Date)).toBeUndefined();
    });
  });

  describe("invalid arguments", () => {
    it("should handle missing date parameter", () => {
      expect(
        (formatDateISO as unknown as () => string | undefined)()
      ).toBeUndefined();
    });

    it("should handle extra parameters gracefully", () => {
      const date = new Date("2024-12-15T10:30:45.123Z");
      const expectedISO = "2024-12-15T10:30:45.123Z";

      const result = (
        formatDateISO as unknown as (
          date: Date | string | undefined,
          extra: string
        ) => string | undefined
      )(date, "extra");

      expect(result).toBe(expectedISO);
    });
  });
});
