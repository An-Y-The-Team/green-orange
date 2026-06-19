/**
 * Vietnamese display labels + badge variants for every domain enum, kept in one
 * place so list pages, detail tabs and printed documents stay consistent.
 *
 * `variant` matches the @yan/ui Badge variants (default/secondary/warning/
 * success/destructive). `label` is the Vietnamese text shown to users.
 */
import { ContractStatus } from "@/app/(dashboard)/contracts/enums";
import { CrewRole, CrewStatus } from "@/app/(dashboard)/crew/enums";
import {
  AcceptanceStatus,
  CostCategory,
  ProjectStage,
  ProjectType,
  ScheduleOutcome,
} from "@/app/(dashboard)/projects/enums";
import { QuoteStatus, QuoteType } from "@/app/(dashboard)/quotes/enums";
import {
  MilestoneStatus,
  MilestoneType,
} from "@/app/(dashboard)/receivables/enums";

type BadgeVariant =
  | "default"
  | "secondary"
  | "warning"
  | "success"
  | "destructive";

type Label = { label: string; variant: BadgeVariant };

// The lifecycle stages, in display order — used by the pipeline stepper.
export const projectStageOrder: ProjectStage[] = [
  ProjectStage.YEU_CAU,
  ProjectStage.KHAO_SAT,
  ProjectStage.BAO_GIA,
  ProjectStage.HOP_DONG,
  ProjectStage.CHUAN_BI,
  ProjectStage.THI_CONG,
  ProjectStage.NGHIEM_THU,
  ProjectStage.QUYET_TOAN,
  ProjectStage.THANH_TOAN,
  ProjectStage.DONG,
];

export const projectStage: Record<ProjectStage, Label> = {
  [ProjectStage.YEU_CAU]: { label: "Yêu cầu", variant: "secondary" },
  [ProjectStage.KHAO_SAT]: { label: "Khảo sát", variant: "secondary" },
  [ProjectStage.BAO_GIA]: { label: "Báo giá", variant: "default" },
  [ProjectStage.HOP_DONG]: { label: "Hợp đồng", variant: "default" },
  [ProjectStage.CHUAN_BI]: { label: "Chuẩn bị hồ sơ", variant: "warning" },
  [ProjectStage.THI_CONG]: { label: "Đang thi công", variant: "warning" },
  [ProjectStage.NGHIEM_THU]: { label: "Nghiệm thu", variant: "default" },
  [ProjectStage.QUYET_TOAN]: { label: "Quyết toán", variant: "default" },
  [ProjectStage.THANH_TOAN]: { label: "Chờ thanh toán", variant: "warning" },
  [ProjectStage.DONG]: { label: "Đã đóng", variant: "success" },
};

export const projectType: Record<ProjectType, string> = {
  [ProjectType.VE_SINH]: "Vệ sinh",
  [ProjectType.THI_CONG]: "Thi công",
};

export const scheduleOutcome: Record<ScheduleOutcome, Label> = {
  [ScheduleOutcome.ON_TIME]: { label: "Đúng hạn", variant: "success" },
  [ScheduleOutcome.DELAYED]: { label: "Trễ hạn", variant: "destructive" },
  [ScheduleOutcome.EARLY]: { label: "Sớm hạn", variant: "success" },
};

export const quoteType: Record<QuoteType, string> = {
  [QuoteType.BAO_GIA]: "Báo giá",
  [QuoteType.QUYET_TOAN]: "Quyết toán",
};

export const quoteStatus: Record<QuoteStatus, Label> = {
  [QuoteStatus.NHAP]: { label: "Nháp", variant: "secondary" },
  [QuoteStatus.DA_GUI]: { label: "Đã gửi", variant: "default" },
  [QuoteStatus.DA_DUYET]: { label: "Đã duyệt", variant: "success" },
  [QuoteStatus.TU_CHOI]: { label: "Từ chối", variant: "destructive" },
};

export const contractStatus: Record<ContractStatus, Label> = {
  [ContractStatus.NHAP]: { label: "Nháp", variant: "secondary" },
  [ContractStatus.DA_KY]: { label: "Đã ký", variant: "default" },
  [ContractStatus.DANG_THUC_HIEN]: {
    label: "Đang thực hiện",
    variant: "warning",
  },
  [ContractStatus.THANH_LY]: { label: "Đã thanh lý", variant: "success" },
};

export const costCategory: Record<CostCategory, string> = {
  [CostCategory.VAT_TU]: "Vật tư",
  [CostCategory.NHAN_CONG]: "Nhân công",
  [CostCategory.THIET_BI]: "Thiết bị",
  [CostCategory.SU_CO]: "Sự cố",
  [CostCategory.KHAC]: "Khác",
};

export const acceptanceStatus: Record<AcceptanceStatus, Label> = {
  [AcceptanceStatus.CHO_NGHIEM_THU]: {
    label: "Chờ nghiệm thu",
    variant: "warning",
  },
  [AcceptanceStatus.DA_NGHIEM_THU]: {
    label: "Đã nghiệm thu",
    variant: "success",
  },
  [AcceptanceStatus.CO_VAN_DE]: { label: "Có vấn đề", variant: "destructive" },
};

export const milestoneType: Record<MilestoneType, string> = {
  [MilestoneType.TAM_UNG]: "Tạm ứng",
  [MilestoneType.TIEN_DO]: "Theo tiến độ",
  [MilestoneType.NGHIEM_THU]: "Khi nghiệm thu",
  [MilestoneType.GIU_BAO_HANH]: "Giữ lại bảo hành",
};

export const milestoneStatus: Record<MilestoneStatus, Label> = {
  [MilestoneStatus.CHUA_DEN_HAN]: {
    label: "Chưa đến hạn",
    variant: "secondary",
  },
  [MilestoneStatus.CHO_THANH_TOAN]: {
    label: "Chờ thanh toán",
    variant: "warning",
  },
  [MilestoneStatus.DA_THU]: { label: "Đã thu", variant: "success" },
  [MilestoneStatus.QUA_HAN]: { label: "Quá hạn", variant: "destructive" },
};

export const crewRole: Record<CrewRole, string> = {
  [CrewRole.THO_CHINH]: "Thợ chính",
  [CrewRole.THO_PHU]: "Thợ phụ",
  [CrewRole.VE_SINH]: "Nhân viên vệ sinh",
  [CrewRole.GIAM_SAT]: "Giám sát",
  [CrewRole.LAI_XE]: "Lái xe",
};

export const crewStatus: Record<CrewStatus, Label> = {
  [CrewStatus.DANG_LAM]: { label: "Đang làm", variant: "success" },
  [CrewStatus.TAM_NGHI]: { label: "Tạm nghỉ", variant: "warning" },
  [CrewStatus.NGHI_VIEC]: { label: "Nghỉ việc", variant: "secondary" },
};
