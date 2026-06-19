// Thanh toán theo đợt — closed value sets for the milestone payment schedule /
// công nợ.

export enum MilestoneType {
  TAM_UNG = "tam_ung", // advance
  TIEN_DO = "tien_do", // progress
  NGHIEM_THU = "nghiem_thu", // on acceptance
  GIU_BAO_HANH = "giu_bao_hanh", // retained until warranty ends
}

export enum MilestoneStatus {
  CHUA_DEN_HAN = "chua_den_han", // not yet due
  CHO_THANH_TOAN = "cho_thanh_toan", // due / awaiting payment
  DA_THU = "da_thu", // collected
  QUA_HAN = "qua_han", // overdue
}
