import _ from "lodash";

import { isNilOrEmptyString, safeJSONParse } from "../../../../utils";

function removeEmptyEntriesFromArray(arr: unknown[]): unknown[] {
  return arr.filter((item) => !isNilOrEmptyString(item));
}

function removeEmptyFieldsFromObject(
  obj: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => !isNilOrEmptyString(value))
  );
}

function handleArrayDefaults(
  cleanedParams: URLSearchParams,
  key: string,
  current: string,
  defaultArray: unknown[]
): void {
  const parsedArray = safeJSONParse(current, [] as unknown[]);
  const sortedParsedArray = _.sortBy(removeEmptyEntriesFromArray(parsedArray));
  const sortedDefaultArray = _.sortBy(
    removeEmptyEntriesFromArray(defaultArray)
  );
  if (_.isEqual(sortedParsedArray, sortedDefaultArray)) {
    cleanedParams.delete(key);
  }
}

function handleObjectDefaults(
  cleanedParams: URLSearchParams,
  key: string,
  current: string,
  defaultObject: Record<string, unknown>
): void {
  const parsedObject = removeEmptyFieldsFromObject(
    safeJSONParse(current, {} as Record<string, unknown>)
  );

  Object.entries(parsedObject).forEach(([fieldKey, fieldValue]) => {
    if (
      isNilOrEmptyString(fieldValue) ||
      _.isEqual(fieldValue, defaultObject[fieldKey])
    ) {
      delete parsedObject[fieldKey];
    }
  });

  if (Object.keys(parsedObject).length === 0) {
    cleanedParams.delete(key);
  } else {
    cleanedParams.set(key, JSON.stringify(parsedObject));
  }
}

/**
 * Clean URL parameters by removing default values and empty values
 */
export function cleanUrlParams<TParams extends Record<string, unknown>>(
  params: URLSearchParams,
  newParams: Partial<TParams>,
  defaultParams: TParams
): URLSearchParams {
  const cleanedParams = new URLSearchParams(params);

  Object.entries(newParams).forEach(([key, value]: [string, unknown]) => {
    if (value === "" || value === undefined || value === null) {
      cleanedParams.delete(key);
      return;
    }

    if (Array.isArray(value)) {
      const cleanedArray = removeEmptyEntriesFromArray(value);
      if (cleanedArray.length === 0) {
        cleanedParams.delete(key);
      } else {
        cleanedParams.set(key, JSON.stringify(cleanedArray));
      }
      return;
    }

    if (typeof value === "object") {
      const cleanedObject = removeEmptyFieldsFromObject(
        value as Record<string, unknown>
      );
      if (Object.keys(cleanedObject).length === 0) {
        cleanedParams.delete(key);
      } else {
        cleanedParams.set(key, JSON.stringify(cleanedObject));
      }
      return;
    }

    cleanedParams.set(key, String(value));
  });

  // Remove default values to keep URL clean
  Object.entries(defaultParams).forEach(([key, defaultValue]) => {
    const current = cleanedParams.get(key);
    if (current === null || current === "") {
      cleanedParams.delete(key);
      return;
    }

    if (typeof defaultValue === "object" && defaultValue !== null) {
      if (Array.isArray(defaultValue)) {
        handleArrayDefaults(
          cleanedParams,
          key,
          current,
          defaultValue as unknown[]
        );
      } else {
        handleObjectDefaults(
          cleanedParams,
          key,
          current,
          defaultValue as Record<string, unknown>
        );
      }
      return;
    }

    if (String(defaultValue) === current) {
      cleanedParams.delete(key);
    }
  });

  return cleanedParams;
}
