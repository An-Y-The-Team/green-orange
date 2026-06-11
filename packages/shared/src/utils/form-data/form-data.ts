import { isFunction, isNull, isObject, isString } from "../is/is";
import { safeJSONParse } from "../safe-json-parse/safe-json-parse";

/**
 * Parse a JSON array field from FormData
 * Returns undefined if field doesn't exist or parsing fails
 */
export function parseFormDataArray(
  fieldName: string,
  formData: FormData
): string[] | undefined {
  if (!isString(fieldName)) throw new TypeError("fieldName must be a string");
  if (!formData.has(fieldName)) {
    return undefined;
  }

  return safeJSONParse(formData.get(fieldName) as string);
}

/**
 * Parse a boolean field from FormData
 * Returns true if value is "true", undefined otherwise
 */
export function parseFormDataBoolean(
  fieldName: string,
  formData: FormData
): boolean | undefined {
  if (!isString(fieldName)) throw new TypeError("fieldName must be a string");

  return formData.get(fieldName) === "true" ? true : undefined;
}

/**
 * Parse a number field from FormData
 * Returns undefined if field doesn't exist
 */
export function parseFormDataNumber(
  fieldName: string,
  formData: FormData
): number | undefined {
  if (!isString(fieldName)) throw new TypeError("fieldName must be a string");
  if (!formData.has(fieldName)) return undefined;
  if (!formData.get(fieldName)?.toString().trim()) return NaN;

  return Number(formData.get(fieldName));
}

/**
 * Utility function to conditionally add FormData fields to an object
 * Only adds fields that exist in the FormData to the target object
 */
export function addFormDataFields<T extends Record<string, unknown>>(
  formData: FormData,
  target: T,
  fieldMap: Partial<Record<keyof T, string | (() => unknown)>>
): T {
  if (!(formData instanceof FormData))
    throw new TypeError("formData must be a FormData instance");

  if (!isObject(target) || isNull(target))
    throw new TypeError("target must be a non-null object");

  if (!isObject(fieldMap) || isNull(fieldMap))
    throw new TypeError("fieldMap must be a non-null object");

  for (const [key, fieldConfig] of Object.entries(fieldMap)) {
    const fieldName = isString(fieldConfig) ? fieldConfig : key;

    if (formData.has(fieldName)) {
      if (isFunction(fieldConfig)) {
        (target as Record<string, unknown>)[key] = fieldConfig();
      } else {
        const value = formData.get(fieldName) as string | null;
        (target as Record<string, unknown>)[key] = value || undefined;
      }
    }
  }

  return target;
}

/**
 * Utility function to append dirty fields to FormData
 * Only appends fields that are marked as dirty (changed)
 */
export function appendDirtyFields<T extends Record<string, unknown>>(
  formData: FormData,
  data: T,
  dirtyFields: Record<string, unknown>,
  fieldMap: Partial<Record<keyof T, string | ((value: unknown) => void)>>
): void {
  if (!(formData instanceof FormData))
    throw new TypeError("formData must be a FormData instance");

  if (!isObject(data) || isNull(data))
    throw new TypeError("data must be a non-null object");

  if (!isObject(dirtyFields) || isNull(dirtyFields))
    throw new TypeError("dirtyFields must be a non-null object");

  if (!isObject(fieldMap) || isNull(fieldMap))
    throw new TypeError("fieldMap must be a non-null object");

  for (const [key, fieldConfig] of Object.entries(fieldMap)) {
    const isDirty = dirtyFields[key];

    // Handle both boolean and boolean[] dirty field types
    // Empty objects {} are not considered dirty (no nested fields are marked)
    if (
      isDirty === true ||
      (Array.isArray(isDirty) && isDirty.some(Boolean)) ||
      (isObject(isDirty) &&
        !isNull(isDirty) &&
        !Array.isArray(isDirty) &&
        Object.keys(isDirty as object).length > 0)
    ) {
      const fieldName = isString(fieldConfig) ? fieldConfig : key;
      const value = data[key as keyof T];

      if (isFunction(fieldConfig)) {
        fieldConfig(value);
      } else if (Array.isArray(value) || (isObject(value) && !isNull(value))) {
        formData.append(fieldName, JSON.stringify(value));
      } else {
        formData.append(fieldName, String(value ?? ""));
      }
    }
  }
}
