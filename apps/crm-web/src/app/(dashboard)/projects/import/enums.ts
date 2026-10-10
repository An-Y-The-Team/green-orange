// "Nhập từ báo giá" — closed value sets of the import page.

/** Where one dropped workbook stands; drives its card's badge and the button. */
export enum ImportRowState {
  UNREADABLE = "unreadable", // not an .xlsx, or not the template at all
  CHECKING = "checking", // looking up the existing client / site / contact
  BLOCKED = "blocked", // the file itself has to be fixed (sheets, money)
  NEEDS_FILL = "needs_fill", // read, but a field the job needs is blank
  NEEDS_PICK = "needs_pick", // fine, but no loại công trình matched yet
  READY = "ready",
  IMPORTED = "imported",
  FAILED = "failed", // the server refused it — the message says why
}

/**
 * The header fields a công trình cannot open without. Blank in the workbook
 * (the operator left the Bia placeholder) = typed on the card instead of
 * sending them back to Excel. Money and line items are NOT here: the báo giá
 * is the paper the client holds, so those are corrected in the file.
 */
export enum ImportField {
  PROJECT_NAME = "project_name",
  SITE_ADDRESS = "site_address",
  CLIENT_NAME = "client_name",
}

/** The three blocks the Bia sheet reads in, top-down. */
export enum CoverBlock {
  JOB = "job", // Công trình, Mã số CT, Công việc, Ngày, Địa chỉ
  COMPANY = "company", // Bên B — the company itself, skipped
  CLIENT = "client", // Bên A
}

/** The columns a priced table is read by, found by their header text. */
export enum PriceColumn {
  STT = "stt",
  DESC = "desc",
  UNIT = "unit",
  QTY = "qty",
  PRICE = "price",
  AMOUNT = "amount",
}
