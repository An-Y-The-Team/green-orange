import { isNumber, isString } from "../is/is";

export const generateRandomId = (length: number = 6): string => {
  if (!isNumber(length)) throw new TypeError("Length must be a number");
  const safeLength = Math.floor(length);
  if (!Number.isFinite(safeLength) || safeLength <= 0)
    throw new Error("Length must be a positive finite number");

  return Math.random()
    .toString(36)
    .substring(2, 2 + safeLength);
};

/**
 * Returns the appropriate singular or plural form of a word based on count
 * @param count - The number used to determine singular vs plural
 * @param singular - The singular form of the word
 * @param plural - Optional plural form (defaults to singular + "s")
 * @returns The appropriate form of the word
 * @example
 * pluralize(1, "character") // "character"
 * pluralize(5, "character") // "characters"
 * pluralize(0, "person", "people") // "people"
 */
export const pluralize = (
  count: number,
  singular: string,
  plural?: string
): string => {
  if (!isNumber(count)) throw new TypeError("Count must be a number");
  if (!isString(singular)) throw new TypeError("Singular must be a string");
  if (plural && !isString(plural))
    throw new TypeError("Plural must be a string");

  return count === 1 ? singular : (plural ?? `${singular}s`);
};

/**
 * Trims all whitespace from a string, including:
 * - Leading and trailing whitespace
 * - Special Unicode whitespace characters
 * - Zero-width characters and control characters
 * - Invisible formatting characters
 * @param value - The string to trim
 * @returns The trimmed string with all whitespace removed
 */
export const trimAllWhitespace = (value: string): string => {
  if (!isString(value)) throw new TypeError("Value must be a string");
  return value
    .replace(
      /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u206A-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0\uFFF9-\uFFFB]/g,
      ""
    )

    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .replace(/^[\s\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+/, "")
    .replace(/[\s\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+$/, "");
};

/**
 * Formats a character name to title case (capitalizes first letter of each word)
 * Uses Unicode-aware regex to properly handle international characters
 * @param value - The string to format
 * @returns The formatted name in title case
 * @example
 * formatStringToTitleCase("JOHN DOE") // "John Doe"
 * formatStringToTitleCase("mary-jane") // "Mary-Jane"
 * formatStringToTitleCase("tyler") // "Tyler"
 * formatStringToTitleCase("über") // "Über"
 * formatStringToTitleCase("привет мир") // "Привет Мир"
 */
export const formatStringToTitleCase = (value: string): string => {
  if (!isString(value)) throw new TypeError("Value must be a string");
  // Use Unicode property escapes: \p{L} matches any letter, \P{L} matches any non-letter
  return value
    .toLowerCase()
    .replace(
      /(^|\P{L})(\p{L})/gu,
      (_, boundary, char) => boundary + char.toUpperCase()
    );
};

/**
 * Removes ALL non-ASCII characters for HTTP header safety.
 *
 * HTTP headers only support ASCII (0-127). This function strips:
 * - All characters with Unicode values > 127
 * - Emoji, Japanese, Korean, Chinese, Arabic, accented characters, etc.
 * - Empty parentheses/brackets left behind after removal
 *
 * Use this for values that will be sent as HTTP headers (e.g., Helicone tracking).
 * For LLM content that supports Unicode, use sanitizeForLLM instead.
 *
 * @param value - The string to sanitize (undefined/null returns empty string)
 * @returns ASCII-only string safe for HTTP headers
 *
 * @example
 * sanitizeForHttpHeader("Hello World") // "Hello World"
 * sanitizeForHttpHeader("EP 13: PINOKO (ピノコ愛してる)") // "EP 13: PINOKO"
 * sanitizeForHttpHeader("Test [日本語] here") // "Test here"
 * sanitizeForHttpHeader("Größe über") // "Gre ber"
 */
export const sanitizeForHttpHeader = (
  value: string | undefined | null
): string => {
  if (!value) return "";

  return (
    value
      // Remove non-ASCII and control characters (keep only printable ASCII per RFC 7230)
      // Allowed: horizontal tab (0x09), space (0x20), visible chars (0x21-0x7E)
      // This prevents header injection vulnerabilities from control chars like \r\n

      .replace(/[^\x09\x20-\x7E]/g, "")
      // Remove empty parentheses/brackets left behind (with optional whitespace inside)
      .replace(/\(\s*\)|\[\s*\]|\{\s*\}/g, "")
      // Clean up any resulting multiple spaces
      .replace(/\s{2,}/g, " ")
      .trim()
  );
};

/**
 * Removes emoji and other characters that can cause encoding issues with LLM APIs.
 *
 * Some LLM SDKs fail when encountering characters with
 * Unicode values > 255 during HTTP serialization. This function strips:
 * - Emoji and extended pictographic characters
 * - Variation selectors (text/emoji presentation modifiers)
 * - Lone UTF-16 surrogates (malformed Unicode)
 *
 * Preserves all standard text including non-Latin scripts (Japanese, Korean,
 * Arabic, German umlauts, accented characters, etc.)
 *
 * @param value - The string to sanitize (undefined/null returns empty string)
 * @returns Sanitized string safe for LLM API requests
 *
 * @example
 * sanitizeForLLM("Hello 😀 World") // "Hello World"
 * sanitizeForLLM("日本語 キャラクター") // "日本語 キャラクター"
 * sanitizeForLLM("Größe über") // "Größe über"
 *
 */
export const sanitizeForLLM = (value: string | undefined | null): string => {
  if (!value) return "";

  return (
    value
      // Remove emoji and extended pictographic characters
      .replace(/\p{Extended_Pictographic}/gu, "")
      // Remove variation selectors and ZWJ (often left behind after emoji removal)
      // - U+FE0E: text presentation selector
      // - U+FE0F: emoji presentation selector
      // - U+200D: Zero Width Joiner (used in compound emoji like family)
      .replace(/[\uFE0E\uFE0F\u200D]/g, "")
      // Remove any remaining lone surrogates (malformed Unicode)
      .replace(/[\uD800-\uDFFF]/g, "")
      // Clean up any resulting multiple spaces
      .replace(/\s{2,}/g, " ")
      .trim()
  );
};

/**
 * Sanitizes a string for use in filenames by:
 * 1. Removing emojis and other pictographic characters
 * 2. Replacing all non-alphanumeric characters with a specified replacement (default: "_")
 * 3. Collapsing multiple replacement characters into one
 * 4. Trimming leading/trailing replacement characters
 * 5. Converting to lowercase
 *
 * This ensures the filename contains only characters that are universally safe
 * across different operating systems and file systems.
 *
 * @param value - The string to sanitize
 * @param replacement - The character to replace non-alphanumeric characters with (default: "_")
 * @returns Sanitized alphanumeric string
 *
 * @example
 * sanitizeAlphanumeric("Take #1 @Special! 😀") // "take_1_special"
 * sanitizeAlphanumeric("Hello World", "-") // "hello-world"
 */
export const sanitizeAlphanumeric = (
  value: string | undefined | null,
  replacement: string = "_"
): string => {
  if (!value) return "";

  const safeReplacement = replacement.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return (
    value
      // Remove emoji and extended pictographic characters
      .replace(/\p{Extended_Pictographic}/gu, "")
      // Remove variation selectors and ZWJ
      .replace(/[\uFE0E\uFE0F\u200D]/g, "")
      // Convert to lowercase
      .toLowerCase()
      // Replace non-alphanumeric characters
      .replace(/[^a-z0-9]/g, replacement)
      // Collapse multiple replacement characters
      .replace(new RegExp(`${safeReplacement}{2,}`, "g"), replacement)
      // Trim leading/trailing replacement characters
      .replace(new RegExp(`^${safeReplacement}+|${safeReplacement}+$`, "g"), "")
  );
};
