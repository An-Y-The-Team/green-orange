import { isString } from "../is/is";

/**
 * Escapes regex special characters in a string to prevent regex injection attacks.
 * This ensures that user input is treated as literal text rather than regex patterns.
 *
 * @param str - The string to escape
 * @returns The escaped string safe for use in regex patterns, or empty string if input is not a string
 *
 * @example
 * ```typescript
 * const userInput = "user.name+test";
 * const escaped = escapeRegex(userInput); // "user\.name\+test"
 * const regex = new RegExp(escaped, "i");
 * ```
 */
export function escapeRegex(str: string): string {
  if (!isString(str)) {
    return "";
  }
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Escapes Atlas Search wildcard special characters (`*`, `?`, `\`)
 * so they are treated as literal text in a wildcard query.
 */
export function escapeWildcard(str: string): string {
  if (!isString(str)) {
    return "";
  }
  return str.replace(/\\/g, "\\\\").replace(/\*/g, "\\*").replace(/\?/g, "\\?");
}
