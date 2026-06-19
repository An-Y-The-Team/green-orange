// Nhân sự — closed value sets for the crew feature. Values stay snake_case so a
// response from the backend (POST/PATCH /crew) maps 1:1 onto these.

export enum CrewRole {
  THO_CHINH = "tho_chinh", // skilled / lead worker
  THO_PHU = "tho_phu", // helper
  VE_SINH = "ve_sinh", // cleaner
  GIAM_SAT = "giam_sat", // supervisor
  LAI_XE = "lai_xe", // driver
}

export enum CrewStatus {
  DANG_LAM = "dang_lam", // active
  TAM_NGHI = "tam_nghi", // temporarily off
  NGHI_VIEC = "nghi_viec", // left
}
