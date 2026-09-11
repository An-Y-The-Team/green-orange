/**
 * Vietnamese display text shared across the app — enum labels (glossary:
 * docs/features/crm-database-schema.md) plus the field names, buttons and
 * document boilerplate that appear on more than one page. Change a word here
 * and every screen follows.
 *
 * `variant` matches the @yan/ui Badge variants. User-managed catalogs
 * (project types, crew roles) come from the API already in Vietnamese —
 * no maps here. Action/toast messages live in `constants/server-action.ts`.
 *
 * ponytail: copy used by exactly one page stays inline at that page — a
 * dictionary entry only pays off once a string has two call sites.
 */
import { ClientType } from "@/app/(dashboard)/clients/enums";
import { ContractStatus } from "@/app/(dashboard)/contracts/enums";
import { MAX_SHIFT_HOURS } from "@/app/(dashboard)/crew/constants";
import {
  CrewMemberStatus,
  EmploymentType,
  TimekeepingFlag,
  TimekeepingSource,
  TimekeepingStatus,
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

// The 8 lifecycle stages, in display order — the workspace stepper.
/**
 * The pipeline in order — derived, not re-listed. It used to be a second
 * hand-written copy of `ProjectStage`'s declaration order, so adding a stage
 * meant editing two files and getting away with editing one.
 *
 * `Object.values` preserves declaration order for a **string** enum (no reverse
 * numeric mapping to interleave), which is what makes this safe.
 */
export const PROJECT_STAGE_ORDER: ProjectStage[] = Object.values(ProjectStage);

export const PROJECT_STAGES: Record<ProjectStage, Label> = {
  // Colour follows the PHASE, monotonically along the pipeline:
  // grey (bán hàng) → amber (chuẩn bị) → solid (đang làm) → green (kết thúc).
  //
  // It used to be grey, solid, solid, amber, amber, solid, solid, green — the
  // same solid-black pill on four *non-adjacent* stages, so the column grouped
  // unrelated stages and had to be read word by word (measured in plan 00: 5 of
  // 8 rendered identically). Four phases is the granularity a list column can
  // carry; the label distinguishes the two stages inside each phase.
  // `destructive` stays reserved for failure (Hủy, Quá hạn).
  [ProjectStage.REQUEST]: {
    label: "Yêu cầu & Khảo sát",
    variant: "secondary",
  },
  [ProjectStage.QUOTE]: { label: "Báo giá", variant: "secondary" },
  [ProjectStage.CONTRACT]: { label: "Hợp đồng", variant: "warning" },
  [ProjectStage.PAPERWORK]: { label: "Chuẩn bị hồ sơ", variant: "warning" },
  [ProjectStage.EXECUTION]: { label: "Thi công", variant: "default" },
  [ProjectStage.ACCEPTANCE]: { label: "Nghiệm thu", variant: "default" },
  [ProjectStage.SETTLEMENT]: {
    label: "Quyết toán & Thanh toán",
    variant: "success",
  },
  [ProjectStage.CLOSED]: { label: "Đã đóng", variant: "success" },
};

export const PROJECT_STATUSES: Record<ProjectStatus, Label> = {
  [ProjectStatus.ACTIVE]: { label: "Đang hoạt động", variant: "success" },
  [ProjectStatus.ON_HOLD]: { label: "Hoãn", variant: "warning" },
  [ProjectStatus.CANCELLED]: { label: "Hủy", variant: "destructive" },
};

export const CLIENT_TYPES: Record<ClientType, string> = {
  [ClientType.COMPANY]: "Công ty",
  [ClientType.INDIVIDUAL]: "Cá nhân",
};

export const EXECUTION_SUB_STATUSES: Record<ExecutionSubStatus, Label> = {
  [ExecutionSubStatus.KICKOFF]: { label: "Khởi công", variant: "secondary" },
  [ExecutionSubStatus.HOARDING]: { label: "Dựng rào", variant: "default" },
  [ExecutionSubStatus.WORKS]: { label: "Thi công", variant: "warning" },
};

export const ACCEPTANCE_SUB_STATUSES: Record<AcceptanceSubStatus, Label> = {
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

export const PAPERWORK_STATUSES: Record<PaperworkStatus, Label> = {
  [PaperworkStatus.PREPARING]: { label: "Chưa xong", variant: "secondary" },
  [PaperworkStatus.SUBMITTED]: { label: "Đã nộp", variant: "warning" },
  [PaperworkStatus.APPROVED]: { label: "Đã duyệt", variant: "success" },
};

export const QUOTE_STATUSES: Record<QuoteStatus, Label> = {
  [QuoteStatus.DRAFT]: { label: "Nháp", variant: "secondary" },
  [QuoteStatus.WAITING]: { label: "Chờ duyệt", variant: "warning" },
  [QuoteStatus.DEAL]: { label: "Chốt", variant: "success" },
  [QuoteStatus.ON_HOLD]: { label: "Hoãn", variant: "warning" },
  [QuoteStatus.REJECTED]: { label: "Hủy", variant: "destructive" },
};

/** Older quote versions superseded by a newer one (derived, not a status). */
export const QUOTE_SUPERSEDED_LABEL: Label = {
  label: "Đã thay thế",
  variant: "secondary",
};

export const QUOTE_CHANNELS: Record<QuoteChannel, string> = {
  [QuoteChannel.ZALO]: "Zalo",
  [QuoteChannel.EMAIL]: "Email",
  [QuoteChannel.PRINT]: "In",
};

export const CONTRACT_STATUSES: Record<ContractStatus, Label> = {
  [ContractStatus.DRAFT]: { label: "Nháp", variant: "secondary" },
  [ContractStatus.SIGNED]: { label: "Đã ký", variant: "success" },
};

export const SETTLEMENT_STATUSES: Record<SettlementStatus, Label> = {
  [SettlementStatus.DRAFT]: { label: "Nháp", variant: "secondary" },
  [SettlementStatus.SENT]: { label: "Đã gửi", variant: "default" },
  [SettlementStatus.SIGNED]: { label: "Đã ký", variant: "success" },
};

export const BILL_STATUSES: Record<BillStatus, Label> = {
  [BillStatus.DRAFT]: { label: "Nháp", variant: "secondary" },
  [BillStatus.OFFICIAL]: { label: "Chính thức", variant: "default" },
  [BillStatus.SENT]: { label: "Đã gửi", variant: "warning" },
  [BillStatus.PAID]: { label: "Đã thanh toán", variant: "success" },
};

export const MILESTONE_TYPES: Record<MilestoneType, string> = {
  [MilestoneType.DEPOSIT]: "Tạm ứng (Cọc)",
  [MilestoneType.PROGRESS]: "Theo tiến độ",
  [MilestoneType.ACCEPTANCE]: "Khi nghiệm thu",
};

export const MILESTONE_STATUSES: Record<MilestoneStatus, Label> = {
  [MilestoneStatus.NOT_DUE]: { label: "Chưa đến hạn", variant: "secondary" },
  [MilestoneStatus.AWAITING_PAYMENT]: {
    label: "Chờ thanh toán",
    variant: "warning",
  },
  [MilestoneStatus.PAID]: { label: "Đã thu", variant: "success" },
};

/** Derived-only display for overdue milestones/paperwork — never stored. */
export const OVERDUE_LABEL: Label = {
  label: "Quá hạn",
  variant: "destructive",
};

export const EMPLOYMENT_TYPES: Record<EmploymentType, string> = {
  [EmploymentType.PERMANENT]: "Chính thức",
  [EmploymentType.DAY_HIRE]: "Thời vụ",
};

export const CREW_MEMBER_STATUSES: Record<CrewMemberStatus, Label> = {
  [CrewMemberStatus.WORKING]: { label: "Đang làm", variant: "success" },
  [CrewMemberStatus.ON_LEAVE]: { label: "Tạm nghỉ", variant: "warning" },
  [CrewMemberStatus.LEFT]: { label: "Nghỉ việc", variant: "secondary" },
};

export const TIMEKEEPING_SOURCES: Record<TimekeepingSource, string> = {
  [TimekeepingSource.MANUAL]: "Nhập tay",
  [TimekeepingSource.ZALO_APP]: "Zalo app",
};

export const TIMEKEEPING_STATUSES: Record<TimekeepingStatus, string> = {
  [TimekeepingStatus.OPEN]: "Đang làm",
  [TimekeepingStatus.PENDING]: "Chờ duyệt",
  [TimekeepingStatus.APPROVED]: "Đã duyệt",
  [TimekeepingStatus.REJECTED]: "Từ chối",
};

export const TIMEKEEPING_FLAGS: Record<TimekeepingFlag, string> = {
  [TimekeepingFlag.OVER_CAP]: `Quá ${MAX_SHIFT_HOURS} giờ`,
};

/**
 * Column headers and form-field names reused across pages.
 *
 * Keyed by meaning, not by literal: a word that means two different things
 * gets two keys. `Hủy` the button (`ACTIONS.cancel`) is not `Hủy` the project
 * status (`PROJECT_STATUSES`) — never collapse them, or renaming one silently
 * renames the other.
 */
export const FIELDS = {
  status: "Trạng thái",
  client: "Khách hàng/Công ty",
  clientName: "Tên khách hàng / cty",
  clientType: "Loại khách hàng",
  taxCode: "Mã số thuế",
  contactPerson: "Người liên hệ",
  project: "Công trình",
  projectName: "Tên công trình",
  projectType: "Loại công trình",
  crew: "Nhân sự",
  /** The job a crew member does on site — "Vị trí", not "Vai trò". */
  role: "Vị trí",
  defaultRole: "Vị trí mặc định",
  employmentType: "Hình thức",
  fullName: "Họ và tên",
  jobTitle: "Chức vụ",
  phone: "Số điện thoại / Zalo",
  address: "Địa chỉ công ty",
  /** A company client's registered address — Bên A's address on a contract,
   * distinct from FIELDS.location (a job site). */
  registeredAddress: "Địa chỉ trụ sở",
  location: "Địa điểm/Địa chỉ thi công",
  note: "Ghi chú",
  source: "Nguồn",
  stage: "Giai đoạn",
  amount: "Số tiền",
  signDate: "Ngày ký",
  createdDate: "Ngày tạo",
  collectDate: "Ngày thu",
  dueDate: "Hạn thu",
  fromDate: "Từ ngày",
  toDate: "Đến ngày",
  contractTemplate: "Mẫu hợp đồng",
  paymentMilestone: "Đợt thanh toán",
} as const;

/**
 * Quote/settlement line-item table columns, rendered by the on-screen
 * builders, the print pages, the Lexical document node and the docx export.
 *
 * The builders use the short forms (`ĐV`, `SL`) because their columns are
 * narrow; documents spell them out. Whether that split is deliberate or old
 * drift is unclear, so it is preserved verbatim — collapsing it here would
 * silently change what prints on a signed document.
 */
export const LINE_ITEM_COLUMNS = {
  index: "STT",
  item: "Hạng mục",
  description: "Nội dung",
  descriptionLong: "Nội dung công việc",
  unit: "ĐVT",
  unitShort: "ĐV",
  quantity: "Khối lượng",
  quantityShort: "SL",
  unitPrice: "Đơn giá",
  total: "Thành tiền",
} as const;

/** Button and control captions. */
export const ACTIONS = {
  save: "Lưu",
  saveDraft: "Lưu nháp",
  saving: "Đang lưu…",
  creating: "Đang tạo…",
  adding: "Đang thêm…",
  cancel: "Hủy",
  close: "Đóng",
  edit: "Sửa",
  delete: "Xóa",
  add: "Thêm",
  confirm: "Xác nhận",
  retry: "Thử lại",
  continue: "Tiếp tục",
  send: "Gửi",
  addRow: "+ Thêm dòng",
  deleteRow: "Xóa dòng",
  editDueDate: "Sửa hạn",
} as const;

/**
 * Example values shown as form-input hints. Deliberately NOT the `COMPANY`
 * defaults in config/company.ts — those are GreenOrange's real profile, and
 * wiring a hint to them would print the company's own representative as the
 * suggestion for a customer's contact name.
 */
export const PLACEHOLDERS = {
  personName: "Nguyễn Văn A",
  companyName: "Công ty TNHH ABC",
  address: "123 Đường ABC, Quận 1, TP.HCM",
} as const;

/**
 * The product's name, in the one place it is defined.
 *
 * It shipped as four: "Dịch vụ Ý Ân" (metadata), "GreenOrange CRM" (sidebar),
 * "Yan CRM" (login) and "GreenOrange" (field header) — one app, four names, so
 * a user who saw two of them had no way to know it was the same product.
 * GreenOrange is the brand: the company is CÔNG TY TNHH DỊCH VỤ GREENORANGE.
 */
export const APP_NAME = "Quản lý công trình & nhân sự Ý Ân" as const;

/**
 * Photo attachments are **filenames**, not files: there is no object storage
 * yet (a written-down deferral), so the row records which photo exists in
 * Zalo/Drive and where the note about it lives. "+ Thêm ảnh" promised an
 * upload and saved text, which is worse than saying so.
 */
export const PHOTO_TEXT = {
  add: "+ Ghi tên ảnh",
  hint: "Chưa tải ảnh lên được — ghi tên tệp để đối chiếu với ảnh gửi qua Zalo.",
} as const;

/** "Quay lại …" back-links out of a detail page. */
export const BACK_TO = {
  list: "Quay lại danh sách",
  project: "Quay lại công trình",
  quote: "Quay lại báo giá",
  contract: "Quay lại hợp đồng",
  templates: "Quay lại danh sách mẫu",
  // Were hardcoded at their two call sites, which is how three wordings for
  // "back to the list" got into the app.
  client: "Quay lại khách hàng",
  paperwork: "Quay lại hồ sơ",
  projects: "Quay lại danh sách công trình",
  /** Back into the field shell's Hôm nay card (see the `?from=field` intake). */
  field: "Quay lại Hôm nay",
} as const;

/** Boilerplate on printed/exported documents. */
export const DOCUMENT_TEXT = {
  contractHeading: "HỢP ĐỒNG",
  quoteHeading: "BẢNG BÁO GIÁ",
  partyA: "Bên A (Khách hàng)",
  partyB: "Bên B (Nhà cung cấp dịch vụ)",
  partyASignatory: "ĐẠI DIỆN BÊN A",
  partyBSignatory: "ĐẠI DIỆN BÊN B",
  clientSignatory: "ĐẠI DIỆN KHÁCH HÀNG",
  signHint: "(Ký, ghi rõ họ tên)",
  subtotal: "Tạm tính",
  grandTotal: "Tổng cộng",
  /** Customer-facing đợt status: collected or not — the internal not-due /
   *  awaiting split is not the client's concern. */
  milestoneUnpaid: "Chưa thu",
} as const;
