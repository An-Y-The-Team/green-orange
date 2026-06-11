/**
 * Shared types for image metadata extraction
 * Used by both client-side and server-side utilities
 */

// Basic metadata that can be extracted client-side
export interface BasicImageMetadata {
  dimensions: {
    width: number;
    height: number;
    aspectRatio: string; // "16:9", "3:4", etc. for common ratios
    aspectRatioDecimal: number; // Exact decimal for CSS aspect-ratio property
  };
  colors?: {
    // Named swatches from Vibrant (hex values)
    vibrant?: string;
    muted?: string;
    darkVibrant?: string;
    darkMuted?: string;
    lightVibrant?: string;
    lightMuted?: string;
  };
}

// Extended metadata from server-side processing
export interface ExtendedImageMetadata extends BasicImageMetadata {
  blurhash?: string; // BlurHash string for placeholder
  technical?: {
    format?: string; // "jpeg", "png", "webp", etc.
    hasAlpha?: boolean;
    isAnimated?: boolean;
  };
}

// Client-side extraction result
export interface ClientExtractionResult {
  metadata: BasicImageMetadata;
  thumbnailDataUrl?: string; // Optional small preview
  processingTime: number; // ms
}

// Server-side validation result
export interface MetadataValidationResult {
  isValid: boolean;
  errors?: string[];
  normalizedMetadata?: BasicImageMetadata;
}

// Future enhancement: Queue job for background processing
// export interface MetadataExtractionJob {
//   imageAssetId: string;
//   url: string;
//   priority: "high" | "normal" | "low";
//   attemptCount: number;
//   createdAt: Date;
// }

// Future enhancement: Server-side extraction options
// export interface ExtractionOptions {
//   generateBlurhash?: boolean;
//   extractPalette?: boolean;
//   paletteSize?: number; // Number of colors in palette
//   thumbnailSize?: number; // Size for thumbnail generation
// }
