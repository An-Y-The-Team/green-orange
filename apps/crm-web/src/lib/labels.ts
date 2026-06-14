/**
 * Vietnamese display labels + badge variants for every domain enum, kept in one
 * place so list pages, detail tabs and printed documents stay consistent.
 *
 * `variant` matches the @yan/ui Badge variants (default/secondary/warning/
 * success/destructive). `label` is the Vietnamese text shown to users.
 */
import type {
  AcceptanceStatus,
  ContractStatus,
  CostCategory,
  MilestoneStatus,
  MilestoneType,
  ProjectStage,
  ProjectType,
  QuoteStatus,
  QuoteType,
  ScheduleOutcome,
} from "@/types";

type BadgeVariant =
  | "default"
  | "secondary"
  | "warning"
  | "success"
  | "destructive";

type Label = { label: string; variant: BadgeVariant };

// The lifecycle stages, in display order — used by the pipeline stepper.
export const projectStageOrder: ProjectStage[] = [
  "yeu_cau",
  "khao_sat",
  "bao_gia",
  "hop_dong",
  "chuan_bi",
  "thi_cong",
  "nghiem_thu",
  "quyet_toan",
  "thanh_toan",
  "dong",
];

export const projectStage: Record<ProjectStage, Label> = {
  yeu_cau: { label: "Yêu cầu", variant: "secondary" },
  khao_sat: { label: "Khảo sát", variant: "secondary" },
  bao_gia: { label: "Báo giá", variant: "default" },
  hop_dong: { label: "Hợp đồng", variant: "default" },
  chuan_bi: { label: "Chuẩn bị hồ sơ", variant: "warning" },
  thi_cong: { label: "Đang thi công", variant: "warning" },
  nghiem_thu: { label: "Nghiệm thu", variant: "default" },
  quyet_toan: { label: "Quyết toán", variant: "default" },
  thanh_toan: { label: "Chờ thanh toán", variant: "warning" },
  dong: { label: "Đã đóng", variant: "success" },
};

export const projectType: Record<ProjectType, string> = {
  ve_sinh: "Vệ sinh",
  thi_cong: "Thi công",
};

export const scheduleOutcome: Record<ScheduleOutcome, Label> = {
  on_time: { label: "Đúng hạn", variant: "success" },
  delayed: { label: "Trễ hạn", variant: "destructive" },
  early: { label: "Sớm hạn", variant: "success" },
};

export const quoteType: Record<QuoteType, string> = {
  bao_gia: "Báo giá",
  quyet_toan: "Quyết toán",
};

export const quoteStatus: Record<QuoteStatus, Label> = {
  nhap: { label: "Nháp", variant: "secondary" },
  da_gui: { label: "Đã gửi", variant: "default" },
  da_duyet: { label: "Đã duyệt", variant: "success" },
  tu_choi: { label: "Từ chối", variant: "destructive" },
};

export const contractStatus: Record<ContractStatus, Label> = {
  nhap: { label: "Nháp", variant: "secondary" },
  da_ky: { label: "Đã ký", variant: "default" },
  dang_thuc_hien: { label: "Đang thực hiện", variant: "warning" },
  thanh_ly: { label: "Đã thanh lý", variant: "success" },
};

export const costCategory: Record<CostCategory, string> = {
  vat_tu: "Vật tư",
  nhan_cong: "Nhân công",
  thiet_bi: "Thiết bị",
  su_co: "Sự cố",
  khac: "Khác",
};

export const acceptanceStatus: Record<AcceptanceStatus, Label> = {
  cho_nghiem_thu: { label: "Chờ nghiệm thu", variant: "warning" },
  da_nghiem_thu: { label: "Đã nghiệm thu", variant: "success" },
  co_van_de: { label: "Có vấn đề", variant: "destructive" },
};

export const milestoneType: Record<MilestoneType, string> = {
  tam_ung: "Tạm ứng",
  tien_do: "Theo tiến độ",
  nghiem_thu: "Khi nghiệm thu",
  giu_bao_hanh: "Giữ lại bảo hành",
};

export const milestoneStatus: Record<MilestoneStatus, Label> = {
  chua_den_han: { label: "Chưa đến hạn", variant: "secondary" },
  cho_thanh_toan: { label: "Chờ thanh toán", variant: "warning" },
  da_thu: { label: "Đã thu", variant: "success" },
  qua_han: { label: "Quá hạn", variant: "destructive" },
};
