/**
 * Validation constants and patterns
 * Shared across the entire platform for consistent validation
 */

/**
 * MongoDB ObjectId regex pattern
 * Validates 24-character hexadecimal string
 * Used for validating MongoDB ObjectId strings in forms and APIs
 */
export const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Standard email regex pattern
 * Validates basic email format
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * One decimal place regex pattern
 * Only accepts period as decimal separator
 * Examples: 1, 1.5 (valid) | 1.55, 1,5 (invalid)
 */
export const ONE_DECIMAL_PLACE_REGEX = /^\d+(\.\d)?$/;
