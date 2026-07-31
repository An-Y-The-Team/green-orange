/**
 * Which blocks a printed document's header shows. The two are INDEPENDENT, not
 * alternatives: Vietnamese rules expect official paperwork to carry the Quốc
 * hiệu, and the company letterhead sits on top of that — both together is the
 * normal case, and either may be switched off for the odd internal sheet.
 *
 * These belong to a document TEMPLATE. Templates cover contracts today, but
 * every paperwork type (báo giá, nghiệm thu, quyết toán, đề nghị thanh toán…)
 * is heading the same way, so nothing here is contract-specific — a document
 * with no template simply takes {@link DEFAULT_HEADER_BLOCKS}.
 *
 * Shared by the templates feature (stored per template), the print pages, and
 * `DocumentShell` which renders them — upstream of all three, so it lives here.
 */
export type HeaderBlocks = {
  /** Company letterhead: logo + company details. */
  letterhead: boolean;
  /** Quốc hiệu: the CHXHCN VN motto block. */
  national: boolean;
};

/** Both blocks — the compliant default for any document. */
export const DEFAULT_HEADER_BLOCKS: HeaderBlocks = {
  letterhead: true,
  national: true,
};
