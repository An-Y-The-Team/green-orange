/**
 * Common types used throughout the application
 */

/**
 * Common option type for select dropdowns and similar UI components
 * Used throughout the application for consistent {value, label} patterns
 */
export interface Option<T = string> {
  value: T;
  label: string;
  description?: string;
}
