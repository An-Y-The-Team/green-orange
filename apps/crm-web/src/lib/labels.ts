/**
 * Vietnamese display labels + badge variants for every v2 domain enum — the
 * ONLY place Vietnamese lives in code (glossary:
 * docs/features/crm-database-schema.md). List pages, the workspace, and
 * printed documents all read from here.
 *
 * `variant` matches the @yan/ui Badge variants. User-managed catalogs
 * (project types, crew roles) come from the API already in Vietnamese —
 * no maps here.
 */
import { ClientType } from "@/app/(dashboard)/clients/enums";
import { ContractStatus } from "@/app/(dashboard)/contracts/enums";
import {
  CrewMemberStatus,
  EmploymentType,
  TimekeepingSource,
} from "@/app/(dashboard)/crew/enums";
import {
  AcceptanceSubStatus,
  ExecutionSubStatus,
  PaperworkStatus,
  ProjectStage,
  ProjectStatus,
} from "@/app/(dashboard)/projects/enums";
import { QuoteChannel, QuoteStatus } from "@/app/(dashboard)/quotes/enums";
import {
  BillStatus,
  MilestoneStatus,
  MilestoneType,
  SettlementStatus,
} from "@/app/(dashboard)/receivables/enums";

type BadgeVariant =
  | "default"
  | "secondary"
  | "warning"
  | "success"
  | "destructive";

type Label = { label: string; variant: BadgeVariant };

// The 9 lifecycle stages, in display order — the workspace stepper.
export const projectStageOrder: ProjectStage[] = [
  ProjectStage.REQUEST,
  ProjectStage.SURVEY,
  ProjectStage.QUOTE,
  ProjectStage.CONTRACT,
  ProjectStage.PAPERWORK,
  ProjectStage.EXECUTION,
  ProjectStage.ACCEPTANCE,
  ProjectStage.SETTLEMENT,
  ProjectStage.CLOSED,
];

export const projectStage: Record<ProjectStage, Label> = {
  [ProjectStage.REQUEST]: { label: "Yêu cầu", variant: "secondary" },
  [ProjectStage.SURVEY]: { label: "Khảo sát", variant: "secondary" },
  [ProjectStage.QUOTE]: { label: "Báo giá", variant: "default" },
  [ProjectStage.CONTRACT]: { label: "Hợp đồng", variant: "default" },
  [ProjectStage.PAPERWORK]: { label: "Chuẩn bị hồ sơ", variant: "warning" },
  [ProjectStage.EXECUTION]: { label: "Thi công", variant: "warning" },
  [ProjectStage.ACCEPTANCE]: { label: "Nghiệm thu", variant: "default" },
  [ProjectStage.SETTLEMENT]: {
    label: "Quyết toán & Thanh toán",
    variant: "default",
  },
  [ProjectStage.CLOSED]: { label: "Đã đóng", variant: "success" },
};

export const projectStatus: Record<ProjectStatus, Label> = {
  [ProjectStatus.ACTIVE]: { label: "Đang hoạt động", variant: "success" },
  [ProjectStatus.ON_HOLD]: { label: "Hoãn", variant: "warning" },
  [ProjectStatus.CANCELLED]: { label: "Hủy", variant: "destructive" },
};

export const clientType: Record<ClientType, string> = {
  [ClientType.COMPANY]: "Công ty",
  [ClientType.INDIVIDUAL]: "Cá nhân",
};

export const executionSubStatus: Record<ExecutionSubStatus, Label> = {
  [ExecutionSubStatus.KICKOFF]: { label: "Khởi công", variant: "secondary" },
  [ExecutionSubStatus.HOARDING]: { label: "Dựng rào", variant: "default" },
  [ExecutionSubStatus.WORKS]: { label: "Thi công", variant: "warning" },
};

export const acceptanceSubStatus: Record<AcceptanceSubStatus, Label> = {
  [AcceptanceSubStatus.REQUEST_SENT]: {
    label: "Gửi yêu cầu",
    variant: "secondary",
  },
  [AcceptanceSubStatus.INSPECTING]: {
    label: "Nghiệm thu",
    variant: "default",
  },
  [AcceptanceSubStatus.REWORK]: { label: "Bổ sung", variant: "warning" },
  [AcceptanceSubStatus.PASSED]: { label: "Đạt", variant: "success" },
};

export const paperworkStatus: Record<PaperworkStatus, Label> = {
  [PaperworkStatus.PREPARING]: { label: "Chưa xong", variant: "secondary" },
  [PaperworkStatus.SUBMITTED]: { label: "Đã nộp", variant: "warning" },
  [PaperworkStatus.APPROVED]: { label: "Đã duyệt", variant: "success" },
};

export const quoteStatus: Record<QuoteStatus, Label> = {
  [QuoteStatus.DRAFT]: { label: "Nháp", variant: "secondary" },
  [QuoteStatus.WAITING]: { label: "Chờ duyệt", variant: "warning" },
  [QuoteStatus.DEAL]: { label: "Chốt", variant: "success" },
  [QuoteStatus.ON_HOLD]: { label: "Hoãn", variant: "warning" },
  [QuoteStatus.REJECTED]: { label: "Hủy", variant: "destructive" },
};

/** Older quote versions superseded by a newer one (derived, not a status). */
export const quoteSuperseded: Label = {
  label: "Đã thay thế",
  variant: "secondary",
};

export const quoteChannel: Record<QuoteChannel, string> = {
  [QuoteChannel.ZALO]: "Zalo",
  [QuoteChannel.EMAIL]: "Email",
  [QuoteChannel.PRINT]: "In",
};

export const contractStatus: Record<ContractStatus, Label> = {
  [ContractStatus.DRAFT]: { label: "Nháp", variant: "secondary" },
  [ContractStatus.SIGNED]: { label: "Đã ký", variant: "success" },
};

export const settlementStatus: Record<SettlementStatus, Label> = {
  [SettlementStatus.DRAFT]: { label: "Nháp", variant: "secondary" },
  [SettlementStatus.SENT]: { label: "Đã gửi", variant: "default" },
  [SettlementStatus.SIGNED]: { label: "Đã ký", variant: "success" },
};

export const billStatus: Record<BillStatus, Label> = {
  [BillStatus.DRAFT]: { label: "Nháp", variant: "secondary" },
  [BillStatus.OFFICIAL]: { label: "Chính thức", variant: "default" },
  [BillStatus.SENT]: { label: "Đã gửi", variant: "warning" },
  [BillStatus.PAID]: { label: "Đã thanh toán", variant: "success" },
};

export const milestoneType: Record<MilestoneType, string> = {
  [MilestoneType.DEPOSIT]: "Tạm ứng (Cọc)",
  [MilestoneType.PROGRESS]: "Theo tiến độ",
  [MilestoneType.ACCEPTANCE]: "Khi nghiệm thu",
};

export const milestoneStatus: Record<MilestoneStatus, Label> = {
  [MilestoneStatus.NOT_DUE]: { label: "Chưa đến hạn", variant: "secondary" },
  [MilestoneStatus.AWAITING_PAYMENT]: {
    label: "Chờ thanh toán",
    variant: "warning",
  },
  [MilestoneStatus.PAID]: { label: "Đã thu", variant: "success" },
};

/** Derived-only display for overdue milestones/paperwork — never stored. */
export const overdue: Label = { label: "Quá hạn", variant: "destructive" };

export const employmentType: Record<EmploymentType, string> = {
  [EmploymentType.PERMANENT]: "Chính thức",
  [EmploymentType.DAY_HIRE]: "Thời vụ",
};

export const crewMemberStatus: Record<CrewMemberStatus, Label> = {
  [CrewMemberStatus.WORKING]: { label: "Đang làm", variant: "success" },
  [CrewMemberStatus.ON_LEAVE]: { label: "Tạm nghỉ", variant: "warning" },
  [CrewMemberStatus.LEFT]: { label: "Nghỉ việc", variant: "secondary" },
};

export const timekeepingSource: Record<TimekeepingSource, string> = {
  [TimekeepingSource.MANUAL]: "Nhập tay",
  [TimekeepingSource.ZALO_APP]: "Zalo app",
};
