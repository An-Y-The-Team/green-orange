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
  CrewTab,
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
  WorkspacePane,
} from "@/app/(dashboard)/projects/enums";
import { QuoteChannel, QuoteStatus } from "@/app/(dashboard)/quotes/enums";
import {
  BillStatus,
  MilestoneStatus,
  MilestoneType,
  SettlementStatus,
} from "@/app/(dashboard)/receivables/enums";
import { AttachmentKind } from "@/components/attachments/enums";

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

// What opens each stage — shown on a future stage's preview and under the
// current stage's progress, so "why can't I do this yet" is answered on screen.
// Mirrors the server's auto-advance rules (crm-api-nest common/stage.ts).
export const STAGE_OPENS: Record<ProjectStage, string> = {
  [ProjectStage.REQUEST]: "Bắt đầu khi khách gọi tới",
  [ProjectStage.QUOTE]: "Mở khi lập báo giá đầu tiên",
  [ProjectStage.CONTRACT]: "Mở khi khách chốt báo giá",
  [ProjectStage.PAPERWORK]:
    "Mở khi nhận cọc — làm song song được từ giai đoạn Hợp đồng",
  [ProjectStage.EXECUTION]:
    "Mở khi hồ sơ cần cho thi công đã duyệt và đã nhận cọc",
  [ProjectStage.ACCEPTANCE]: "Mở khi xác nhận hoàn tất thi công",
  [ProjectStage.SETTLEMENT]: "Mở khi nghiệm thu đạt",
  [ProjectStage.CLOSED]: "Tự đóng khi thu đủ tiền",
};

// One-word stage names for tight spots — the workspace's mobile chip row.
export const STAGE_SHORT_LABELS: Record<ProjectStage, string> = {
  [ProjectStage.REQUEST]: "Yêu cầu",
  [ProjectStage.QUOTE]: "Báo giá",
  [ProjectStage.CONTRACT]: "Hợp đồng",
  [ProjectStage.PAPERWORK]: "Hồ sơ",
  [ProjectStage.EXECUTION]: "Thi công",
  [ProjectStage.ACCEPTANCE]: "Nghiệm thu",
  [ProjectStage.SETTLEMENT]: "Quyết toán",
  [ProjectStage.CLOSED]: "Đã đóng",
};

export const WORKSPACE_PANES: Record<WorkspacePane, string> = {
  [WorkspacePane.DOCUMENTS]: "Giấy tờ",
  [WorkspacePane.CREW]: "Nhân sự",
};

export const PROJECT_STAGES: Record<ProjectStage, Label> = {
  // A stage is where the job IS, so every open stage reads "happening now"
  // (purple) and only Đã đóng reads "done" (blue). The tones have one meaning
  // each (docs/features/crm-ui-redesign.md, "Buttons vs badges", 2026-10-05):
  // the old phase colouring painted Quyết toán blue-green as if it were
  // finished and Hợp đồng amber as if it were waiting. The word carries the
  // stage; Hoãn / Hủy are the project's STATUS badge, never a stage colour.
  [ProjectStage.REQUEST]: { label: "Yêu cầu & Khảo sát", variant: "default" },
  [ProjectStage.QUOTE]: { label: "Báo giá", variant: "default" },
  [ProjectStage.CONTRACT]: { label: "Hợp đồng", variant: "default" },
  [ProjectStage.PAPERWORK]: { label: "Chuẩn bị hồ sơ", variant: "default" },
  [ProjectStage.EXECUTION]: { label: "Thi công", variant: "default" },
  [ProjectStage.ACCEPTANCE]: { label: "Nghiệm thu", variant: "default" },
  [ProjectStage.SETTLEMENT]: {
    label: "Quyết toán & Thanh toán",
    variant: "default",
  },
  [ProjectStage.CLOSED]: { label: "Đã đóng", variant: "success" },
};

export const PROJECT_STATUSES: Record<ProjectStatus, Label> = {
  [ProjectStatus.ACTIVE]: { label: "Đang hoạt động", variant: "default" },
  [ProjectStatus.ON_HOLD]: { label: "Hoãn", variant: "warning" },
  [ProjectStatus.CANCELLED]: { label: "Hủy", variant: "destructive" },
};

export const CLIENT_TYPES: Record<ClientType, string> = {
  [ClientType.COMPANY]: "Công ty",
  [ClientType.INDIVIDUAL]: "Cá nhân",
};

// The badge shows the step the crew is on right now — always "happening now".
export const EXECUTION_SUB_STATUSES: Record<ExecutionSubStatus, Label> = {
  [ExecutionSubStatus.KICKOFF]: { label: "Khởi công", variant: "default" },
  [ExecutionSubStatus.HOARDING]: { label: "Dựng rào", variant: "default" },
  [ExecutionSubStatus.WORKS]: { label: "Thi công", variant: "default" },
};

export const ACCEPTANCE_SUB_STATUSES: Record<AcceptanceSubStatus, Label> = {
  // Waiting on the client to name a date.
  [AcceptanceSubStatus.REQUEST_SENT]: {
    label: "Gửi yêu cầu",
    variant: "warning",
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
  [SettlementStatus.SENT]: { label: "Đã gửi", variant: "warning" }, // waiting on the client to sign
  [SettlementStatus.SIGNED]: { label: "Đã ký", variant: "success" },
};

export const BILL_STATUSES: Record<BillStatus, Label> = {
  [BillStatus.DRAFT]: { label: "Nháp", variant: "secondary" },
  [BillStatus.OFFICIAL]: { label: "Chính thức", variant: "success" },
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
  [CrewMemberStatus.WORKING]: { label: "Đang làm", variant: "default" },
  [CrewMemberStatus.ON_LEAVE]: { label: "Tạm nghỉ", variant: "secondary" },
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
  dueDate: "Hạn thanh toán",
  fromDate: "Từ ngày",
  toDate: "Đến ngày",
  contractTemplate: "Mẫu hợp đồng",
  paymentMilestone: "Đợt thanh toán",
} as const;

/**
 * The /crew tab bar — also the Nhân sự sub-items in the sidebar, which deep-link
 * at `?tab=`. One map, so a tab cannot be called one thing in the nav and
 * another on the page.
 */
export const CREW_TABS: Record<CrewTab, string> = {
  [CrewTab.ROSTER]: "Danh sách",
  [CrewTab.ROLES]: FIELDS.role,
  [CrewTab.TIMEKEEPING]: "Chấm công",
};

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

// File categories — headings on the Giấy tờ tab and default list titles.
export const ATTACHMENT_KINDS: Record<AttachmentKind, string> = {
  [AttachmentKind.SURVEY]: "Ảnh khảo sát",
  [AttachmentKind.SIGNED_QUOTE]: "Báo giá đã xác nhận",
  [AttachmentKind.SIGNED_CONTRACT]: "Hợp đồng đã ký",
  [AttachmentKind.PAYMENT_PROOF]: "Chứng từ thanh toán",
  [AttachmentKind.PAPERWORK]: "Hồ sơ giấy tờ",
  [AttachmentKind.SITE_LOG]: "Ảnh thi công",
  [AttachmentKind.FINISH_IMAGE]: "Ảnh hoàn công",
  [AttachmentKind.DEFECT_IMAGE]: "Ảnh lỗi cần sửa",
  [AttachmentKind.ACCEPTANCE_REPORT]: "Biên bản nghiệm thu",
  [AttachmentKind.SETTLEMENT]: "Biên bản quyết toán",
  [AttachmentKind.VAT_INVOICE]: "Hóa đơn VAT",
  [AttachmentKind.OTHER]: "Tệp khác",
  [AttachmentKind.ID_CARD]: "CCCD",
  [AttachmentKind.CERTIFICATE]: "Chứng chỉ",
};

/**
 * Real uploads: the file goes to the bucket and the row records its key. The
 * copy says "tệp", not "ảnh", because the same control now takes the signed
 * hợp đồng and biên bản nghiệm thu as well as site photos — and it names the
 * limits, because the picker's `accept` list is the only other place a user
 * finds out what will be refused.
 */
export const PHOTO_TEXT = {
  add: "+ Thêm tệp",
  hint: "Ảnh và tài liệu (.pdf, .docx, .xlsx), tối đa 25 MB mỗi tệp.",
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
