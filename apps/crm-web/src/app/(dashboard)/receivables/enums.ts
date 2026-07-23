// Thu & công nợ — v2 contract values (English); labels in src/lib/labels.ts.

export enum SettlementStatus {
  DRAFT = "draft", // Nháp
  SENT = "sent", // Đã gửi
  SIGNED = "signed", // Đã ký — officializes the bill, defines milestones
}

export enum BillStatus {
  DRAFT = "draft", // Nháp — born with its settlement
  OFFICIAL = "official", // Chính thức — client signed the settlement
  SENT = "sent", // Đã gửi
  PAID = "paid", // Đã thanh toán
}

export enum MilestoneType {
  DEPOSIT = "deposit", // Tạm ứng (Cọc, stage 4 — exists before any bill)
  PROGRESS = "progress",
  ACCEPTANCE = "acceptance",
}

// Overdue (Quá hạn) is DERIVED — due date passed and not paid — never stored.
export enum MilestoneStatus {
  NOT_DUE = "not_due", // Chưa đến hạn
  AWAITING_PAYMENT = "awaiting_payment", // Chờ thanh toán
  PAID = "paid", // Đã thu
}
