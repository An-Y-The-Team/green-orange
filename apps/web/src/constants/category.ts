// Service lines GreenOrange offers. `BOTH` is used by entities that can span
// both lines (testimonials, contact submissions); concrete jobs use only
// CLEANING or CONSTRUCTION.
export enum Category {
  CLEANING = "cleaning",
  CONSTRUCTION = "construction",
  BOTH = "both",
}

// Section filters add an "all" pseudo-option on top of the concrete categories.
export enum CategoryFilter {
  ALL = "all",
  CLEANING = "cleaning",
  CONSTRUCTION = "construction",
}

// Narrows an unknown value (e.g. a raw URL search param) to a Category.
export const isCategory = (value: unknown): value is Category =>
  typeof value === "string" &&
  (Object.values(Category) as string[]).includes(value);
