import { isNull, isString, isUndefined } from "../is/is";

/**
 * Safely parses a JSON string with type safety and flexible fallback
 * @param str The JSON string to parse
 * @param fallback The value to return if parsing fails (defaults to undefined)
 * @returns The parsed value or fallback if parsing fails
 */
export function safeJSONParse<T>(str: string | null | undefined): T | undefined;

export function safeJSONParse<T>(
  str: string | null | undefined,
  fallback: T
): T;

export function safeJSONParse<T>(
  str: string | null | undefined,
  fallback?: T
): T | undefined {
  if (isUndefined(str) || isNull(str) || !isString(str)) return fallback;

  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
