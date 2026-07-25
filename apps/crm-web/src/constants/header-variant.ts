/**
 * Printed-document header style — shared by the contracts feature (a template
 * stores it as `header_style`), the print pages, and `DocumentShell` which
 * renders it. Upstream of all three, so it lives here rather than in any one
 * of them.
 */
export enum HeaderVariant {
  /** Company branding — quotes, settlements, acceptance requests. */
  LETTERHEAD = "letterhead",
  /** CHXHCN VN motto — legal contracts. */
  NATIONAL = "national",
}

export const DEFAULT_HEADER_VARIANT = HeaderVariant.LETTERHEAD;
