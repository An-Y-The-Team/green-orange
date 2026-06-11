export const SORT_ORDER = {
  ASC: "asc",
  DESC: "desc",
} as const;

export type SortOrder = (typeof SORT_ORDER)[keyof typeof SORT_ORDER];

export enum ESortOrder {
  ASC = 1,
  DESC = -1,
}

export const SORT_BY = {
  CREATED_AT: "created_at",
  UPDATED_AT: "updated_at",
} as const;

export type SortBy = (typeof SORT_BY)[keyof typeof SORT_BY];

// Filter suffixes for API query conventions
export const FILTER_SUFFIXES = {
  IN: "_in",
  LIKE: "_like",
  GT: "_gt",
  LT: "_lt",
  EXISTS: "_exists",
} as const;

export type FilterSuffix =
  (typeof FILTER_SUFFIXES)[keyof typeof FILTER_SUFFIXES];

// Pagination defaults
export const PAGE_SIZES = [10, 20, 50, 100] as const;

// Cursor pagination direction constants
export const CURSOR_DIRECTION = {
  AFTER: "after",
  BEFORE: "before",
} as const;

export type CursorDirection =
  (typeof CURSOR_DIRECTION)[keyof typeof CURSOR_DIRECTION];

// Sort field type constants for cursor pagination
export const CURSOR_SORT_FIELD_TYPE = {
  NUMERIC: "numeric",
  STRING: "string",
} as const;

export type CursorSortFieldType =
  (typeof CURSOR_SORT_FIELD_TYPE)[keyof typeof CURSOR_SORT_FIELD_TYPE];
