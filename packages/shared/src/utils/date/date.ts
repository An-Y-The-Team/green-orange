import { TIME_FORMAT } from "../../constants";
import dayjs from "../../lib/dayjs";

export const isValidDateInput = (date: Date | string | undefined): boolean => {
  if (date === undefined || date === null) return false;
  if (typeof date === "string") {
    if (!date.trim()) return false;
    return true;
  }
  if (date instanceof Date) {
    return true;
  }
  return false;
};

/**
 * Format a date with a localized, readable format
 */
export function formatDate(date: Date | string, includeTime = false): string {
  if (!isValidDateInput(date)) {
    return "N/A";
  }

  const format = includeTime
    ? "dddd, MMMM D, YYYY [at] h:mm A z"
    : "dddd, MMMM D, YYYY";

  return dayjs(date).format(format);
}

/**
 * Format a date without year or timezone - just month and day (e.g., "Dec 15")
 */
export function formatDateShort(date: Date | string): string {
  if (!isValidDateInput(date)) {
    return "N/A";
  }
  return dayjs(date).format("MMM D");
}

/**
 * Format a date in a specific timezone
 */
export function formatDateWithTimezone(
  date: Date | string,
  timezone: string,
  format?: (typeof TIME_FORMAT)[keyof typeof TIME_FORMAT]
): string {
  if (!isValidDateInput(date)) {
    return "N/A";
  }
  try {
    const dateFormat = "dddd, MMMM D, YYYY";
    let timeFormat: string;
    switch (format) {
      case TIME_FORMAT.TWENTY_FOUR_HOUR:
        timeFormat = "H:mm";
        break;
      case TIME_FORMAT.TWELVE_HOUR_NO_MINUTES:
        timeFormat = "h A";
        break;
      default:
        timeFormat = "h:mm A";
    }

    const dateTimeFormat = `${dateFormat} [at] ${timeFormat} z`;
    return dayjs(date).tz(timezone).format(dateTimeFormat);
  } catch (_error) {
    // Fallback if timezone is invalid
    return formatDate(date, true);
  }
}

/**
 * Format a date with an optional timezone, falling back to UTC if the timezone
 * is invalid or missing. Always includes the timezone abbreviation so the
 * recipient knows which timezone is shown.
 */
export function formatDateForEmail(
  date: Date | string,
  format: string,
  timezone?: string
): string {
  if (!isValidDateInput(date)) return "";
  try {
    return dayjs(date)
      .tz(timezone ?? "UTC")
      .format(format);
  } catch {
    return dayjs(date).utc().format(format);
  }
}

/**
 * Format a date in YYYY-MM-DD format
 */
export function formatDateYMD(date: Date | string | undefined): string {
  if (!isValidDateInput(date)) return "";
  return dayjs(date).format("YYYY-MM-DD");
}

export function formatDateDMYHMS(date: Date | string): string {
  if (!isValidDateInput(date)) return "";
  return dayjs(date).format("DD/MM/YYYY - HH:mm:ss");
}

/**
 * Convert a date to an ISO string
 */
export function formatDateISO(
  date: Date | string | undefined
): string | undefined {
  if (!isValidDateInput(date)) return undefined;

  const d = date instanceof Date ? date : new Date(date as Date | string);

  if (isNaN(d.getTime())) return undefined;

  return d.toISOString();
}
