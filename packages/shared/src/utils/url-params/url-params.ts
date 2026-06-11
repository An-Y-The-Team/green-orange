export function appendParam(
  params: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined | null
): void {
  // added type checks by unit tests
  if (!params) return;
  if (!(params instanceof URLSearchParams)) return;
  if (typeof value === "string" && value === "") return;
  if (typeof value === "number" && Number.isNaN(value)) return;

  const validTypes = ["string", "number", "boolean"];
  if (!validTypes.includes(typeof value)) return;

  params.append(key, String(value));
}

/**
 * Validates if a string is a valid URL with proper protocol and hostname
 * @param urlString - The URL string to validate
 * @returns true if valid URL, false otherwise
 */
export function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return Boolean(url.protocol && url.hostname);
  } catch {
    return false;
  }
}
