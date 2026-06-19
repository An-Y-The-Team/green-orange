// Báo giá / Quyết toán — closed value sets. The `type` discriminates an initial
// quote (báo giá) from a final settlement (quyết toán).

export enum QuoteType {
  BAO_GIA = "bao_gia",
  QUYET_TOAN = "quyet_toan",
}

export enum QuoteStatus {
  NHAP = "nhap",
  DA_GUI = "da_gui",
  DA_DUYET = "da_duyet",
  TU_CHOI = "tu_choi",
}
