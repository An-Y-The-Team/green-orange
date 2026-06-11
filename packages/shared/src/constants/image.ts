/**
 * Image upload and processing constraints
 */

// File size limits
export const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

// Dimension limits
export const MAX_DIMENSION = 8000; // 8000px maximum width or height

/**
 * Accepted MIME types for image uploads
 */
export enum AcceptedMimeType {
  JPEG = "image/jpeg",
  JPG = "image/jpg",
  PNG = "image/png",
  GIF = "image/gif",
  WEBP = "image/webp",
}

/**
 * Array of accepted MIME types extracted from the enum
 */
export const ACCEPTED_MIME_TYPES = Object.values(AcceptedMimeType);
