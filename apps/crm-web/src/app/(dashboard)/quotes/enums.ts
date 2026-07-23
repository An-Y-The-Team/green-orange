// Báo giá — v2 contract values (English); labels in src/lib/labels.ts.
// Bargaining = new version; sent versions are never edited; the latest
// version carries the live status. Quyết toán is its own entity now
// (receivables feature), no more quote `type`.

export enum QuoteStatus {
  DRAFT = "draft", // Nháp
  WAITING = "waiting", // Chờ duyệt
  DEAL = "deal", // Chốt — gates stage 4
  ON_HOLD = "on_hold", // Hoãn — project parks with it
  REJECTED = "rejected", // Hủy — project cancels with it
}

export enum QuoteChannel {
  ZALO = "zalo",
  EMAIL = "email",
  PRINT = "print",
}
