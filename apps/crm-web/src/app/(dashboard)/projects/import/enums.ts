// "Nhập từ báo giá" — closed value sets of the import page.

/** Where one dropped workbook stands; drives its card's badge and the button. */
export enum ImportRowState {
  UNREADABLE = "unreadable", // not an .xlsx, or not the template at all
  CHECKING = "checking", // looking up the existing client / site / contact
  BLOCKED = "blocked", // read, but something the job needs is missing
  NEEDS_PICK = "needs_pick", // fine, but no loại công trình matched yet
  READY = "ready",
  IMPORTED = "imported",
  FAILED = "failed", // the server refused it — the message says why
}
