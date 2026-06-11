// Common API response types
import { SortBy, SortOrder } from "../constants";

/**
 * @deprecated
 * For offset pagination, use BaseOffsetPaginationParams.
 * For cursor pagination, use BaseCursorPaginationParams
 */
export interface PaginationOptions<TCustomPipeline = unknown> {
  limit?: number;
  offset?: number;
  cursor?: string;
  page?: number;
  search?: string;
  projection?: object;
  sort?: {
    sortBy?: SortBy;
    sortOrder?: SortOrder;
  };
  customPipeline?: TCustomPipeline;
}

/**
 * @deprecated
 * For offset pagination, use BaseOffsetResult.
 */
export interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  nextCursor?: string;
  totalCount?: number;
}

/**
 * @deprecated
 * For offset pagination, use BaseOffsetResult.
 */
export interface BasedPaginatedResponse<T> {
  data: T[];
  pagination: {
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * @deprecated
 * For offset pagination, use BaseOffsetResult.
 */
export interface PaginatedResponse<T> extends BasedPaginatedResponse<T> {
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * @deprecated Use BaseCursorResult instead
 */
export interface CursorPaginatedResponse<T> extends BasedPaginatedResponse<T> {
  pagination: {
    limit: number;
    nextCursor?: string;
    previousCursor?: string;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// JSON API Cursor pagination specific options
export interface CursorPaginationOptions {
  // JSON API spec uses pageAfter and pageBefore instead of cursor + direction
  after?: string; // Opaque cursor string for getting items after this cursor
  before?: string; // Opaque cursor string for getting items before this cursor
  size?: number; // page[size] - number of items to return
}
