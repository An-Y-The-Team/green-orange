/**
 * Common HTTP Content-Type (MIME type) constants.
 * Reference: https://www.iana.org/assignments/media-types/media-types.xhtml
 */
export const CONTENT_TYPE = {
  JSON: "application/json",
  JAVASCRIPT: "application/javascript",
  PDF: "application/pdf",
  ZIP: "application/zip",
  OCTET_STREAM: "application/octet-stream",
  XML: "application/xml",
  FORM_URLENCODED: "application/x-www-form-urlencoded",
  GZIP: "application/gzip",
  TEXT: "text/plain",
  HTML: "text/html",
  CSS: "text/css",
  CSV: "text/csv",
  MARKDOWN: "text/markdown",

  // Image
  JPEG: "image/jpeg",
  PNG: "image/png",
  GIF: "image/gif",
  SVG: "image/svg+xml",
  WEBP: "image/webp",
  ICO: "image/x-icon",

  // Audio
  MPEG: "audio/mpeg",
  MP3: "audio/mp3",
  WAV: "audio/wav",
  WEBA: "audio/webm",
  AAC: "audio/aac",
  M4A: "audio/m4a",
  OGG_AUDIO: "audio/ogg",

  // Video
  MP4: "video/mp4",
  WEBM: "video/webm",
  OGV: "video/ogg",
  QUICKTIME: "video/quicktime",

  // Multipart
  FORM_DATA: "multipart/form-data",
  BYTERANGES: "multipart/byteranges",

  // Documents
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  // Custom/Platform Specific
  FOUNTAIN: "application/vnd.fountain",
} as const;

export type ContentType = (typeof CONTENT_TYPE)[keyof typeof CONTENT_TYPE];

export const CONTENT_TYPE_VALUES = Object.values(CONTENT_TYPE);

export const CONTENT_DISPOSITION = {
  ATTACHMENT: "attachment",
  INLINE: "inline",
} as const;

export type ContentDisposition =
  (typeof CONTENT_DISPOSITION)[keyof typeof CONTENT_DISPOSITION];

export const CONTENT_DISPOSITION_VALUES = Object.values(CONTENT_DISPOSITION);

export const CACHE_CONTROL = {
  NO_CACHE: "no-cache",
  NO_STORE: "no-store",
  MAX_AGE: "max-age",
  PUBLIC: "public",
  PRIVATE: "private",
  MUST_REVALIDATE: "must-revalidate",
  PROXY_REVALIDATE: "proxy-revalidate",
  S_MAXAGE: "s-maxage",
} as const;

export type CacheControl = (typeof CACHE_CONTROL)[keyof typeof CACHE_CONTROL];

export const CACHE_CONTROL_VALUES = Object.values(CACHE_CONTROL);

export const HTTP_HEADER = {
  // Request Headers
  ACCEPT: "Accept",
  ACCEPT_CHARSET: "Accept-Charset",
  ACCEPT_ENCODING: "Accept-Encoding",
  ACCEPT_LANGUAGE: "Accept-Language",
  AUTHORIZATION: "Authorization",
  CACHE_CONTROL: "Cache-Control",
  CONNECTION: "Connection",
  CONTENT_LENGTH: "Content-Length",
  CONTENT_TYPE: "Content-Type",
  COOKIE: "Cookie",
  HOST: "Host",
  IF_MATCH: "If-Match",
  IF_MODIFIED_SINCE: "If-Modified-Since",
  IF_NONE_MATCH: "If-None-Match",
  ORIGIN: "Origin",
  REFERER: "Referer",
  USER_AGENT: "User-Agent",

  // Response Headers
  ACCESS_CONTROL_ALLOW_ORIGIN: "Access-Control-Allow-Origin",
  ACCESS_CONTROL_ALLOW_METHODS: "Access-Control-Allow-Methods",
  ACCESS_CONTROL_ALLOW_HEADERS: "Access-Control-Allow-Headers",
  CONTENT_DISPOSITION: "Content-Disposition",
  CONTENT_ENCODING: "Content-Encoding",
  ETAG: "ETag",
  LOCATION: "Location",
  SET_COOKIE: "Set-Cookie",
  SERVER: "Server",
  X_POWERED_BY: "X-Powered-By",

  // Custom/Common X-Headers
  X_REQUESTED_WITH: "X-Requested-With",
  X_FORWARDED_FOR: "X-Forwarded-For",
  X_CSRF_TOKEN: "X-CSRF-Token",
} as const;

export type HttpHeader = (typeof HTTP_HEADER)[keyof typeof HTTP_HEADER];
