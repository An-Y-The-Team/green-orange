import { isObject, isString } from "../../is/is";
import {
  CACHE_CONTROL,
  CACHE_CONTROL_VALUES,
  CONTENT_DISPOSITION_VALUES,
  CONTENT_TYPE,
  CONTENT_TYPE_VALUES,
  type CacheControl,
  type ContentDisposition,
  type ContentType,
  HTTP_HEADER,
} from "../constants";

type ContentDispositionOption = {
  filename: string;
  type?: ContentDisposition;
};

type HttpHeaderOptions = {
  contentType?: ContentType;
  contentDisposition?: ContentDispositionOption;
  cacheControl?: CacheControl;
};
/**
 * Formats a Content-Disposition header value safely, handling non-ASCII characters
 * according to RFC 5987.
 *
 * @param filename - The filename to include in the header
 * @param type - Disposition type, usually "attachment" (default) or "inline"
 * @returns The formatted header value
 *
 * @example
 * ```typescript
 * formatContentDisposition("story😀.fountain")
 * // 'attachment; filename="story_.fountain"; filename*=UTF-8\'\'story%F0%9F%98%80.fountain'
 * ```
 */
const formatContentDisposition = (
  filename: string,
  type: ContentDisposition = "attachment"
): string => {
  if (!isString(filename)) throw new TypeError("Filename must be a string");
  if (!isString(type) || !CONTENT_DISPOSITION_VALUES.includes(type))
    throw new TypeError("Type must be attachment or inline");
  const encodedFilename = encodeURIComponent(filename);

  // Fallback filename for older clients: replace non-ASCII characters with underscores
  // This avoids the ByteString conversion error in frameworks like Next.js
  const fallbackFilename = filename
    .replace(/[^\x20-\x7E]+/gu, "_")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
  return `${type}; filename="${fallbackFilename}"; filename*=UTF-8''${encodedFilename}`;
};

/**
 * Creates a Headers object from common HTTP header options.
 *
 * @param options - Header configuration options
 * @returns A Headers object populated with the specified values
 */
export const formatHttpHeader = (options: HttpHeaderOptions): Headers => {
  const headers = new Headers();

  // Guard against null/undefined options
  if (!options || !isObject(options)) {
    return headers;
  }

  const {
    contentType = CONTENT_TYPE.TEXT,
    cacheControl = CACHE_CONTROL.NO_CACHE,
    contentDisposition,
  } = options;

  if (contentType && CONTENT_TYPE_VALUES.includes(contentType)) {
    headers.set(HTTP_HEADER.CONTENT_TYPE, contentType);
  }

  if (
    contentDisposition &&
    isString(contentDisposition.filename) &&
    contentDisposition.type &&
    CONTENT_DISPOSITION_VALUES.includes(contentDisposition.type)
  ) {
    headers.set(
      HTTP_HEADER.CONTENT_DISPOSITION,
      formatContentDisposition(
        contentDisposition.filename,
        contentDisposition.type
      )
    );
  }

  if (cacheControl && CACHE_CONTROL_VALUES.includes(cacheControl)) {
    headers.set(HTTP_HEADER.CACHE_CONTROL, cacheControl);
  }

  return headers;
};
