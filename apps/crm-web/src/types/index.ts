/**
 * CRM domain types.
 *
 * These shapes are the contract between the UI and the FastAPI backend
 * (apps/crm-api). Field names use snake_case for multi-word fields (created_at,
 * close_date, due_date) so a response from the API maps 1:1 onto these types
 * with no transformation — that is what makes the mock→API swap in
 * src/lib/api trivial. Keep them in sync with the backend's `*Public` schemas.
 */

export type CustomerStatus = "active" | "lead" | "churned";

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: CustomerStatus;
  created_at: string;
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string;
  title: string;
  company: string;
}

export type LeadStatus = "new" | "contacted" | "qualified" | "lost";

export interface Lead {
  id: number;
  name: string;
  company: string;
  source: string;
  status: LeadStatus;
  value: number;
  owner: string;
}

export type DealStage =
  | "prospect"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export interface Deal {
  id: number;
  title: string;
  company: string;
  stage: DealStage;
  amount: number;
  close_date: string;
}

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: number;
  title: string;
  due_date: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
}

/* -------------------------------------------------------------------------- *
 * GreenOrange domain — cleaning & construction service lifecycle.
 *
 * A Công Trình (Project) is the spine. A client inquiry is scouted, quoted
 * (Báo giá), put under a Hợp đồng, worked on-site (with tracked Chi phí),
 * accepted (Nghiệm thu), settled with a final Quyết toán, and paid off in
 * milestones (Thanh toán) before the contract closes.
 *
 * Records cross-reference by `code` (CT-… / HD-…), not numeric id, so the
 * mock data reads naturally and the project detail tabs can join slices.
 * -------------------------------------------------------------------------- */

// Công Trình — the project lifecycle spine.
export type ProjectType = "ve_sinh" | "thi_cong";

// The lifecycle stages, in order. The project detail pipeline renders these.
export type ProjectStage =
  | "yeu_cau" // 1. client inquiry
  | "khao_sat" // 2. site survey / scouting
  | "bao_gia" // 4. quotation drafted
  | "hop_dong" // 7. contract signed
  | "chuan_bi" // 8. permits / paperwork
  | "thi_cong" // 9. on-site work
  | "nghiem_thu" // 12. acceptance / hand-over
  | "quyet_toan" // 13. final settlement
  | "thanh_toan" // 14. awaiting payment
  | "dong"; // 15. contract closed

// Schedule outcome, set once the work finishes (step 11).
export type ScheduleOutcome = "on_time" | "delayed" | "early";

export interface Project {
  id: number;
  code: string;
  name: string;
  customer: string;
  type: ProjectType;
  address: string;
  stage: ProjectStage;
  schedule_outcome?: ScheduleOutcome;
  start_date: string;
  end_date: string;
  manager: string;
  contract_value: number; // revenue
  estimated_cost: number; // budgeted internal cost
  progress: number; // 0..100
}

// Báo giá / Quyết toán — initial quote vs final settlement. Same shape, the
// `type` discriminates: a quyết toán is just a quote reconciling actual costs.
export type QuoteType = "bao_gia" | "quyet_toan";
export type QuoteStatus = "nhap" | "da_gui" | "da_duyet" | "tu_choi";

export interface QuoteItem {
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
}

export interface Quote {
  id: number;
  code: string;
  project_code: string;
  customer: string;
  title: string;
  type: QuoteType;
  issue_date: string;
  valid_until: string;
  status: QuoteStatus;
  items: QuoteItem[];
  vat_rate: number; // e.g. 0.08 for 8% VAT
  notes: string;
}

// Hợp đồng
export type ContractStatus = "nhap" | "da_ky" | "dang_thuc_hien" | "thanh_ly";

export interface Contract {
  id: number;
  code: string;
  project_code: string;
  customer: string;
  title: string;
  value: number;
  signed_date: string;
  start_date: string;
  end_date: string;
  status: ContractStatus;
  payment_terms: string;
  // Party A (customer) profile — printed in the contract preamble. `customer` is
  // the legal name; these optional fields fill the rest of the party block.
  customer_address?: string;
  customer_tax_code?: string;
  customer_rep?: string; // người đại diện
  customer_position?: string; // chức vụ
  customer_phone?: string;
  // VAT rate applied to the contract value (e.g. 0.08). Drives the financial
  // breakdown tokens (before-tax / VAT amount). Defaults to 0.08 when unset.
  vat_rate?: number;
  // Optional printable template. When set, the contract document is rendered by
  // merging this template's body with the contract's data; when unset, the
  // detail page falls back to the built-in hard-coded layout.
  template_id?: number;
  // Rich-text clause prose (Lexical editorState JSON, string form). Seeded from
  // the chosen template on create, then editable per contract. Merge tokens stay
  // live (resolved at render). When present it supersedes the template body on
  // the detail page; see components/editor/lexical-document.tsx.
  body?: string;
}

// Mẫu hợp đồng — user-authored boilerplate (clauses, headings) with
// {{placeholders}} that merge against a contract's data at render time. The
// variable data lives on the Contract; the reusable prose lives here.
export interface ContractTemplate {
  id: number;
  name: string; // internal name, e.g. "Hợp đồng vệ sinh định kỳ"
  doc_title: string; // printed heading, e.g. "HỢP ĐỒNG DỊCH VỤ VỆ SINH"
  body: string; // Lexical editorState JSON (string form); see lib/lexical-build.ts
  // Printed header style: "national" = CHXHCN VN motto (legal contracts),
  // "letterhead" = company branding. Defaults to "letterhead" when unset.
  header_style?: "letterhead" | "national";
  is_active: boolean;
}

// Chi phí — actual costs and incidents/breakages logged during work (step 10).
export type CostCategory =
  | "vat_tu" // materials
  | "nhan_cong" // labor
  | "thiet_bi" // equipment / tools
  | "su_co" // incident / breakage
  | "khac"; // other / unforeseen

export interface Cost {
  id: number;
  project_code: string;
  date: string;
  category: CostCategory;
  description: string;
  amount: number;
  is_incident: boolean;
}

// Nghiệm thu — acceptance / hand-over (step 12); the gate to final payment.
export type AcceptanceStatus = "cho_nghiem_thu" | "da_nghiem_thu" | "co_van_de";

export interface Acceptance {
  id: number;
  project_code: string;
  date: string;
  status: AcceptanceStatus;
  inspector: string;
  client_rep: string;
  notes: string;
}

// Nhân sự — the crew that performs the work. A small roster (≈8–20 people)
// assigned onto công trình. Kept deliberately light: identity, role, day-rate
// and employment status — not a payroll system.
export type CrewRole =
  | "tho_chinh" // skilled / lead worker
  | "tho_phu" // helper
  | "ve_sinh" // cleaner
  | "giam_sat" // supervisor
  | "lai_xe"; // driver

export type CrewStatus =
  | "dang_lam" // active
  | "tam_nghi" // temporarily off
  | "nghi_viec"; // left

export interface CrewMember {
  id: number;
  name: string;
  phone: string;
  role: CrewRole;
  day_rate: number; // ngày công, VND
  status: CrewStatus;
  note?: string;
  created_at: string;
}

// Phân công — assignment of a crew member onto a công trình. A join row that
// cross-references the project by `code`, matching how quotes/contracts/costs
// join on the project detail page (see byProject() there).
export interface Assignment {
  id: number;
  crew_id: number;
  project_code: string;
  role_on_site?: string; // optional free text, e.g. "Tổ trưởng ca sáng"
  start_date?: string;
}

// Thanh toán theo đợt — milestone payment schedule / công nợ (steps 14-15).
export type MilestoneType =
  | "tam_ung" // advance
  | "tien_do" // progress
  | "nghiem_thu" // on acceptance
  | "giu_bao_hanh"; // retained until warranty ends
export type MilestoneStatus =
  | "chua_den_han" // not yet due
  | "cho_thanh_toan" // due / awaiting payment
  | "da_thu" // collected
  | "qua_han"; // overdue

export interface PaymentMilestone {
  id: number;
  contract_code: string;
  project_code: string;
  customer: string;
  name: string;
  type: MilestoneType;
  status: MilestoneStatus;
  due_amount: number;
  paid_amount: number;
  due_date: string;
  gated_by_acceptance: boolean; // cannot collect until nghiệm thu is done
}
