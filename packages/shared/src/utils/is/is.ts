/**
 * Type guard to check if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Type guard to check if a value is null
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Type guard to check if a value is undefined
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined || typeof value === "undefined";
}

/**
 * Type guard to check if a value is null or undefined
 */
export function isNil(value: unknown): value is null | undefined {
  return isNull(value) || isUndefined(value);
}

/**
 * Type guard to check if a value is a number (excluding NaN)
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

/**
 * Type guard to check if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * Type guard to check if a value is an array
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Type guard to check if a value is an object (but not null, array, or Date)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

/**
 * Type guard to check if a value is a function
 */
export function isFunction(
  value: unknown
): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

/**
 * Type guard to check if a value is null or undefined or empty string
 */
export const isNilOrEmptyString = (v: unknown): boolean => {
  return v === "" || isNil(v);
};
