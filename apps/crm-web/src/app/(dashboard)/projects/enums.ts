// Công Trình — closed value sets for the project lifecycle and its on-site
// sub-resources (Chi phí / Nghiệm thu). Values stay snake_case to map 1:1 onto
// the backend schemas.

export enum ProjectType {
  VE_SINH = "ve_sinh",
  THI_CONG = "thi_cong",
}

// The lifecycle stages, in order. The project detail pipeline renders these.
export enum ProjectStage {
  YEU_CAU = "yeu_cau", // 1. client inquiry
  KHAO_SAT = "khao_sat", // 2. site survey / scouting
  BAO_GIA = "bao_gia", // 4. quotation drafted
  HOP_DONG = "hop_dong", // 7. contract signed
  CHUAN_BI = "chuan_bi", // 8. permits / paperwork
  THI_CONG = "thi_cong", // 9. on-site work
  NGHIEM_THU = "nghiem_thu", // 12. acceptance / hand-over
  QUYET_TOAN = "quyet_toan", // 13. final settlement
  THANH_TOAN = "thanh_toan", // 14. awaiting payment
  DONG = "dong", // 15. contract closed
}

// Schedule outcome, set once the work finishes (step 11).
export enum ScheduleOutcome {
  ON_TIME = "on_time",
  DELAYED = "delayed",
  EARLY = "early",
}

// Chi phí — cost categories logged during work (step 10).
export enum CostCategory {
  VAT_TU = "vat_tu", // materials
  NHAN_CONG = "nhan_cong", // labor
  THIET_BI = "thiet_bi", // equipment / tools
  SU_CO = "su_co", // incident / breakage
  KHAC = "khac", // other / unforeseen
}

// Nghiệm thu — acceptance / hand-over (step 12); the gate to final payment.
export enum AcceptanceStatus {
  CHO_NGHIEM_THU = "cho_nghiem_thu",
  DA_NGHIEM_THU = "da_nghiem_thu",
  CO_VAN_DE = "co_van_de",
}
