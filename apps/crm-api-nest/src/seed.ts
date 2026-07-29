// Seed the local demo dataset. Run: `bun run seed`.
//
// This replaces apps/crm-web/src/data/mock/* — the fixtures the UI was actually
// built and smoke-tested against. So it is not "some rows": it is one công
// trình per lifecycle stage plus the edge cases that drive the interesting
// branches — a superseded quote pair, a double-booked crew member, an overdue
// hồ sơ, an overdue đợt thanh toán, a signed quyết toán with a collected hóa
// đơn, an appointment TODAY, a standalone báo giá with no công trình, a parked
// công trình whose follow-up is due today, and a manual + zalo_app chấm công
// collision on one day. Drop a row and a panel goes blank.
//
// Idempotency: every row is upserted on its real unique key — `username` /
// `name` where the schema declares one (User, ProjectType, CrewRole), an
// explicit stable id everywhere else, because no other demo table has a unique
// business column. Upsert, not skip-if-empty: a second run must converge, not
// walk away from a half-seeded database. Stable ids also mean /projects/2 is the
// same công trình on every machine.
//
// Dates are relative to businessToday() — never `new Date().toISOString()`,
// which resolves the calendar day in UTC and lands on the previous day in
// Vietnam (common/business-date.ts). The stage-1 appointment is therefore
// genuinely today on whatever day the seed runs, which is the whole point of
// that fixture.
//
// Stage invariants: a project carries the artifacts its stage implies (deal
// quote → signed contract → cọc → quyết toán → hóa đơn), and never a state the
// API's own rules can't reach — e.g. a paid cọc auto-advances past `contract`
// (receivables.module.ts), so the contract-stage project's cọc is unpaid.
import { hash } from "@node-rs/argon2";
import { Prisma, PrismaClient } from "@prisma/client";

import { businessToday } from "./common/business-date";

const prisma = new PrismaClient();

const TODAY = businessToday();

/** `n` days from today, pinned to UTC midnight — the @db.Date wire shape. */
export const day = (n: number): Date =>
  new Date(TODAY.getTime() + n * 86_400_000);

/** `hour` Vietnam wall-clock on day `n` — for `*_at` timestamps. */
export const atHour = (n: number, hour: number): Date =>
  new Date(day(n).getTime() + (hour - 7) * 3_600_000);

// ── Lexical bodies ─────────────────────────────────────────────────────────
// Contract template bodies are Lexical editorState JSON, opaque here — crm-web
// renders them (utils/lexical-build). Minimal builders so the templates are
// readable instead of pasted JSON; `merge-field` chips resolve at render time.
type Lex = Record<string, unknown>;

const lexBlock = (type: string, children: Lex[], extra: Lex = {}): Lex => ({
  type,
  version: 1,
  direction: "ltr",
  format: "",
  indent: 0,
  children,
  ...extra,
});
const txt = (text: string): Lex => ({
  type: "text",
  version: 1,
  detail: 0,
  format: 0,
  mode: "normal",
  style: "",
  text,
});
const mergeField = (token: string, label: string): Lex => ({
  type: "merge-field",
  version: 1,
  detail: 0,
  format: 0,
  mode: "token",
  style: "",
  text: label,
  token,
});
const para = (...children: Lex[]) => lexBlock("paragraph", children);
const heading = (text: string) =>
  lexBlock("heading", [txt(text)], { tag: "h2" });
/** The auto báo giá block — expands to the deal quote's pricing at render. */
const LINE_ITEMS: Lex = { type: "line-items", version: 1 };
const lexDoc = (...blocks: Lex[]) =>
  JSON.stringify({ root: lexBlock("root", blocks) });

const contractBody = (scope: string) =>
  lexDoc(
    para(
      txt("Hôm nay, ngày "),
      mergeField("signed_date", "Ngày ký"),
      txt(", hai bên gồm có:")
    ),
    heading("BÊN A (Khách hàng)"),
    para(mergeField("client", "Bên A: Tên")),
    heading("BÊN B (Nhà cung cấp)"),
    para(
      mergeField("company.name", "Bên B: Tên"),
      txt(" — MST: "),
      mergeField("company.tax_id", "Bên B: MST")
    ),
    heading("Điều 1: Nội dung công việc"),
    para(
      txt(scope),
      mergeField("project_code", "Mã công trình"),
      txt(": “"),
      mergeField("project_name", "Tên công trình"),
      txt("”. Khối lượng và đơn giá theo báo giá đã chốt:")
    ),
    LINE_ITEMS,
    heading("Điều 2: Giá trị hợp đồng"),
    para(
      txt("Tổng giá trị: "),
      mergeField("value", "Giá trị (đã gồm VAT)"),
      txt(" (đã gồm VAT "),
      mergeField("vat_rate", "Thuế suất VAT"),
      txt("). Bằng chữ: "),
      mergeField("value_in_words", "Giá trị bằng chữ"),
      txt(".")
    )
  );

// ── Lookup tables (upserted by their unique `name`) ────────────────────────
export const PROJECT_TYPES = ["Vệ sinh", "Thi công", "Tháo dỡ"];
const CREW_ROLES = [
  "Thợ chính",
  "Thợ phụ",
  "Nhân viên vệ sinh",
  "Giám sát",
  "Lái xe",
];

// ── Demo rows (upserted by explicit id) ────────────────────────────────────
type Seeded<T> = T & { id: number };

const CLIENTS: Seeded<Prisma.ClientUncheckedCreateInput>[] = [
  {
    id: 1,
    name: "Công ty TNHH An Phát",
    type: "company",
    tax_code: "0312345678",
    email: "ketoan@anphat.com.vn",
  },
  {
    id: 2,
    name: "Chị Hoa",
    type: "individual",
    note: "Khách lẻ, liên hệ qua Zalo",
  },
];

const CONTACTS: Seeded<Prisma.ContactUncheckedCreateInput>[] = [
  {
    id: 1,
    client_id: 1,
    name: "Trần Văn B",
    phone: "0901234567",
    email: "b.tran@anphat.vn",
    title: "Quản lý toà nhà",
  },
  {
    id: 2,
    client_id: 1,
    name: "Nguyễn Thị C",
    phone: "0912345678",
    email: "c.nguyen@anphat.vn",
    title: "Kế toán",
  },
  // Individual client — the client is their own contact.
  { id: 3, client_id: 2, name: "Chị Hoa", phone: "0987654321" },
];

const LOCATIONS: Seeded<Prisma.LocationUncheckedCreateInput>[] = [
  {
    id: 1,
    client_id: 1,
    name: "Toà nhà A — Q.1",
    address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
    manager_contact_id: 1,
  },
  {
    id: 2,
    client_id: 1,
    name: "Toà nhà B — Q.7",
    address: "88 Nguyễn Văn Linh, Quận 7, TP.HCM",
    manager_contact_id: 1,
  },
  {
    id: 3,
    client_id: 2,
    name: "Mặc định",
    address: "25 Lê Lợi, Quận 3, TP.HCM",
    manager_contact_id: 3,
  },
];

// `default_role_name` → id at write time: roles are keyed by name, so their ids
// are whatever the DB assigned, not necessarily 1…5.
type SeededCrew = Seeded<Prisma.CrewMemberUncheckedCreateInput> & {
  default_role_name: string;
};

const CREW: SeededCrew[] = [
  {
    id: 1,
    name: "Trần Quốc Bảo",
    phone: "0901112233",
    employment_type: "permanent",
    default_role_name: "Giám sát",
    status: "working",
    note: "Giám sát chính các công trình khu trung tâm.",
  },
  {
    id: 2,
    name: "Nguyễn Minh Khoa",
    phone: "0903334455",
    employment_type: "day_hire",
    default_role_name: "Thợ chính",
    status: "working",
  },
  {
    id: 3,
    name: "Bùi Thị Mai",
    phone: "0907778899",
    employment_type: "day_hire",
    default_role_name: "Nhân viên vệ sinh",
    status: "on_leave",
    note: "Tạm nghỉ, dự kiến trở lại tháng sau.",
  },
];

const CONTRACT_TEMPLATES: Seeded<Prisma.ContractTemplateUncheckedCreateInput>[] =
  [
    {
      id: 1,
      name: "Hợp đồng dịch vụ vệ sinh",
      doc_title: "HỢP ĐỒNG DỊCH VỤ VỆ SINH",
      header_style: "national",
      body: contractBody("Bên B cung cấp dịch vụ vệ sinh cho công trình "),
    },
    {
      id: 2,
      name: "Hợp đồng thi công",
      doc_title: "HỢP ĐỒNG THI CÔNG",
      header_style: "national",
      body: contractBody("Bên B thi công hạng mục thuộc công trình "),
    },
  ];

// One project per stage, ids kept identical to the mock fixtures so any older
// smoke-test note (/projects/2 = đang thi công) still lands on the same row.
type SeededProject = Seeded<Prisma.ProjectUncheckedCreateInput> & {
  type_names: string[];
};

export const PROJECTS: SeededProject[] = [
  {
    // Stage 2 — báo giá: v1 rejected, superseded by v2 waiting.
    id: 1,
    code: "CT-2026-001",
    client_id: 1,
    location_id: 1,
    working_contact_id: 1,
    decision_maker_contact_id: 2,
    name: "Vệ sinh kính mặt ngoài Toà nhà A",
    request_note: "Vệ sinh kính mặt ngoài",
    referral_source: "giới thiệu",
    stage: "quote",
    appointment_at: atHour(-18, 9),
    visit_date: day(-18),
    survey_note: "Mặt kính 6 tầng, cần xe nâng cho tầng 4-6.",
    survey_items: [
      { name: "Kính mặt ngoài tầng 1-3", quantity: 420, unit: "m²" },
      {
        name: "Kính mặt ngoài tầng 4-6",
        quantity: 380,
        unit: "m²",
        note: "cần xe nâng",
      },
    ],
    type_names: ["Vệ sinh"],
  },
  {
    // Stage 5 — thi công: late (est end passed, not finished), crew
    // double-booked, chấm công with a manual/zalo collision.
    id: 2,
    code: "CT-2026-002",
    client_id: 1,
    location_id: 2,
    working_contact_id: 1,
    decision_maker_contact_id: 1,
    name: "Thi công cải tạo sảnh Toà nhà B",
    referral_source: "khách cũ",
    stage: "execution",
    visit_date: day(-50),
    client_signed_date: day(-38),
    execution_sub_status: "works",
    start_date: day(-20),
    est_duration_days: 12,
    actual_duration_days: 5,
    approaches: "Che chắn sảnh bằng vách tạm, thi công ngoài giờ hành chính.",
    type_names: ["Thi công"],
  },
  {
    // Stage 9 — đã đóng: signed quyết toán, paid hóa đơn, fully collected.
    id: 3,
    code: "CT-2026-003",
    client_id: 2,
    location_id: 3,
    working_contact_id: 3,
    decision_maker_contact_id: 3,
    name: "Tháo dỡ và vệ sinh nhà phố Q.3",
    stage: "closed",
    appointment_at: atHour(-80, 9),
    visit_date: day(-80),
    client_signed_date: day(-72),
    start_date: day(-66),
    est_duration_days: 12,
    actual_duration_days: 14,
    works_done_at: atHour(-52, 17),
    acceptance_sub_status: "passed",
    acceptance_passed_date: day(-48),
    type_names: ["Tháo dỡ", "Vệ sinh"],
  },
  {
    // Stage 1 — the appointment is TODAY and the visit hasn't happened: the
    // only fixture that lights up the "Hôm nay" blocks on /dashboard and
    // /field, and the stage-1 panel with its survey half still hidden.
    id: 4,
    code: "CT-2026-004",
    client_id: 1,
    location_id: 2,
    working_contact_id: 1,
    decision_maker_contact_id: 1,
    name: "Vệ sinh sảnh Toà nhà B",
    request_note: "Vệ sinh sảnh + thảm",
    referral_source: "gọi lại",
    stage: "request",
    appointment_at: atHour(0, 9),
    type_names: ["Vệ sinh"],
  },
  {
    // Stage 3 — hợp đồng: deal quote only. Cọc deliberately unpaid and no
    // client_signed_date, so the panel's checklist shows both undone rows —
    // and because paying the cọc would auto-advance the project past stage 3.
    id: 5,
    code: "CT-2026-005",
    client_id: 1,
    location_id: 1,
    working_contact_id: 1,
    decision_maker_contact_id: 2,
    name: "Vệ sinh sau cải tạo Toà nhà A",
    referral_source: "khách cũ",
    stage: "contract",
    visit_date: day(-9),
    type_names: ["Vệ sinh"],
  },
  {
    // Stage 4 — hồ sơ: the checklist, including one overdue item.
    id: 6,
    code: "CT-2026-006",
    client_id: 1,
    location_id: 2,
    working_contact_id: 1,
    decision_maker_contact_id: 2,
    name: "Thi công vách kính tầng 2 Toà nhà B",
    referral_source: "khách cũ",
    stage: "paperwork",
    visit_date: day(-35),
    client_signed_date: day(-28),
    start_date: day(3),
    est_duration_days: 20,
    type_names: ["Thi công"],
  },
  {
    // Stage 6 — nghiệm thu: inspecting, with one rework round in its history.
    id: 7,
    code: "CT-2026-007",
    client_id: 1,
    location_id: 1,
    working_contact_id: 1,
    decision_maker_contact_id: 1,
    name: "Tháo dỡ trần sảnh Toà nhà A",
    stage: "acceptance",
    visit_date: day(-50),
    client_signed_date: day(-44),
    start_date: day(-12),
    est_duration_days: 10,
    actual_duration_days: 11,
    works_done_at: atHour(-1, 16),
    acceptance_sub_status: "inspecting",
    type_names: ["Tháo dỡ"],
  },
  {
    // Stage 8 — quyết toán: signed, so un-signing is blocked by a collected
    // đợt; also carries the overdue-free future đợt for the schedule view.
    id: 8,
    code: "CT-2026-008",
    client_id: 1,
    location_id: 2,
    working_contact_id: 1,
    decision_maker_contact_id: 2,
    name: "Vệ sinh kính định kỳ Toà nhà B",
    stage: "settlement",
    visit_date: day(-58),
    client_signed_date: day(-50),
    start_date: day(-30),
    est_duration_days: 14,
    actual_duration_days: 15,
    works_done_at: atHour(-10, 17),
    acceptance_sub_status: "passed",
    acceptance_passed_date: day(-8),
    type_names: ["Vệ sinh"],
  },
  {
    // Parked — the only `on_hold` project, with a follow-up due TODAY: the
    // dashboard's "Cần theo dõi" panel is `status = on_hold && follow_up_date
    // <= today`, so nothing else can fill it. Its báo giá is on_hold too — the
    // pair decide-quote writes when a quote is parked (decide-quote.ts chains
    // quote → project). Stage stays 2, since parking is a status, not a stage.
    id: 9,
    code: "CT-2026-009",
    client_id: 2,
    location_id: 3,
    working_contact_id: 3,
    decision_maker_contact_id: 3,
    name: "Vệ sinh sân thượng nhà phố Q.3",
    request_note: "Vệ sinh sân thượng và lan can",
    referral_source: "khách cũ",
    stage: "quote",
    status: "on_hold",
    follow_up_date: day(0),
    appointment_at: atHour(-22, 14),
    visit_date: day(-22),
    survey_note: "Sân thượng 300m², lan can kính cần vệ sinh riêng.",
    type_names: ["Vệ sinh"],
  },
];

export const QUOTES: Seeded<Prisma.QuoteUncheckedCreateInput>[] = [
  {
    id: 1,
    project_id: 1,
    version: 1,
    status: "rejected",
    total_amount: 40_000_000n,
    decided_date: day(-14),
    note: "Báo giá hiệu lực 30 ngày. Đã gồm hóa chất và vật tư tiêu hao.",
  },
  {
    id: 2,
    project_id: 1,
    version: 2,
    status: "waiting",
    total_amount: 36_050_000n,
    note: "Báo giá hiệu lực 30 ngày. Chưa gồm chi phí xe nâng tầng 4-6.",
  },
  {
    id: 3,
    project_id: 2,
    version: 1,
    status: "deal",
    total_amount: 213_600_000n,
    decided_date: day(-40),
    note: "Thi công dự kiến 45 ngày. Bảo hành 12 tháng.",
  },
  {
    id: 4,
    project_id: 3,
    version: 1,
    status: "deal",
    total_amount: 39_000_000n,
    decided_date: day(-74),
    note: "Bàn giao mặt bằng sạch trong 14 ngày kể từ ngày khởi công.",
  },
  {
    id: 5,
    project_id: 5,
    version: 1,
    status: "deal",
    total_amount: 88_000_000n,
    decided_date: day(-6),
  },
  {
    id: 6,
    project_id: 6,
    version: 1,
    status: "deal",
    total_amount: 120_000_000n,
    decided_date: day(-30),
  },
  {
    id: 7,
    project_id: 7,
    version: 1,
    status: "deal",
    total_amount: 65_000_000n,
    decided_date: day(-46),
  },
  {
    id: 8,
    project_id: 8,
    version: 1,
    status: "deal",
    total_amount: 62_000_000n,
    decided_date: day(-52),
  },
  {
    // Parked with CT-2026-009 (see there).
    id: 9,
    project_id: 9,
    version: 1,
    status: "on_hold",
    total_amount: 18_000_000n,
    decided_date: day(-15),
    note: "Khách xin hoãn vì đang sửa nhà, hẹn liên hệ lại.",
  },
  {
    // Standalone — `project_id: null`, the walk-in báo giá that has no công
    // trình yet (quotes.module.ts allows it). /quotes renders "—" in the Công
    // trình and Khách hàng columns for it; no project-bound quote reaches that
    // branch. Version 1 doesn't collide: @@unique([project_id, version]) treats
    // NULL project_id as distinct in Postgres.
    id: 10,
    project_id: null,
    version: 1,
    status: "waiting",
    total_amount: 9_500_000n,
    note: "Khách đi ngang hỏi giá, chưa mở công trình.",
  },
];

export const QUOTE_ITEMS: Seeded<Prisma.QuoteItemUncheckedCreateInput>[] = [
  {
    id: 1,
    quote_id: 1,
    description: "Vệ sinh kính mặt ngoài",
    unit: "m²",
    quantity: 400,
    unit_price: 100_000n,
    amount: 40_000_000n,
  },
  {
    id: 2,
    quote_id: 2,
    description: "Kính mặt ngoài",
    unit: "m²",
    quantity: 320,
    unit_price: 100_000n,
    amount: 32_000_000n,
  },
  {
    id: 3,
    quote_id: 2,
    description: "Kính sảnh",
    unit: "m²",
    quantity: 45,
    unit_price: 90_000n,
    amount: 4_050_000n,
    sort_order: 1,
  },
  {
    id: 4,
    quote_id: 3,
    description: "Thi công trần thạch cao sảnh",
    unit: "m²",
    quantity: 180,
    unit_price: 350_000n,
    amount: 63_000_000n,
  },
  {
    id: 5,
    quote_id: 3,
    description: "Lát đá granite sàn sảnh",
    unit: "m²",
    quantity: 220,
    unit_price: 480_000n,
    amount: 105_600_000n,
    sort_order: 1,
  },
  {
    id: 6,
    quote_id: 3,
    description: "Hệ thống chiếu sáng sảnh",
    unit: "gói",
    quantity: 1,
    unit_price: 45_000_000n,
    amount: 45_000_000n,
    sort_order: 2,
  },
  {
    id: 7,
    quote_id: 4,
    description: "Tháo dỡ nội thất",
    unit: "gói",
    quantity: 1,
    unit_price: 25_000_000n,
    amount: 25_000_000n,
  },
  {
    id: 8,
    quote_id: 4,
    description: "Vệ sinh hoàn trả mặt bằng",
    unit: "m²",
    quantity: 350,
    unit_price: 40_000n,
    amount: 14_000_000n,
    sort_order: 1,
  },
  {
    id: 9,
    quote_id: 5,
    description: "Vệ sinh sàn sau cải tạo",
    unit: "m²",
    quantity: 1600,
    unit_price: 50_000n,
    amount: 80_000_000n,
  },
  {
    id: 10,
    quote_id: 5,
    description: "Vệ sinh hệ thống đèn sảnh",
    unit: "gói",
    quantity: 1,
    unit_price: 8_000_000n,
    amount: 8_000_000n,
    sort_order: 1,
  },
  {
    id: 11,
    quote_id: 6,
    description: "Thi công vách kính cường lực",
    unit: "m²",
    quantity: 150,
    unit_price: 600_000n,
    amount: 90_000_000n,
  },
  {
    id: 12,
    quote_id: 6,
    description: "Khung nhôm và phụ kiện",
    unit: "gói",
    quantity: 1,
    unit_price: 30_000_000n,
    amount: 30_000_000n,
    sort_order: 1,
  },
  {
    id: 13,
    quote_id: 7,
    description: "Tháo dỡ trần và hệ khung",
    unit: "gói",
    quantity: 1,
    unit_price: 50_000_000n,
    amount: 50_000_000n,
  },
  {
    id: 14,
    quote_id: 7,
    description: "Vận chuyển phế thải",
    unit: "m²",
    quantity: 300,
    unit_price: 50_000n,
    amount: 15_000_000n,
    sort_order: 1,
  },
  {
    id: 15,
    quote_id: 8,
    description: "Vệ sinh kính mặt ngoài (định kỳ)",
    unit: "m²",
    quantity: 2000,
    unit_price: 22_000n,
    amount: 44_000_000n,
  },
  {
    id: 16,
    quote_id: 8,
    description: "Vệ sinh sảnh và thảm",
    unit: "m²",
    quantity: 450,
    unit_price: 40_000n,
    amount: 18_000_000n,
    sort_order: 1,
  },
  {
    id: 17,
    quote_id: 9,
    description: "Vệ sinh sân thượng và lan can kính",
    unit: "m²",
    quantity: 300,
    unit_price: 60_000n,
    amount: 18_000_000n,
  },
  {
    id: 18,
    quote_id: 10,
    description: "Vệ sinh kính căn hộ",
    unit: "m²",
    quantity: 95,
    unit_price: 100_000n,
    amount: 9_500_000n,
  },
];

const QUOTE_SEND_LOGS: Seeded<Prisma.QuoteSendLogUncheckedCreateInput>[] = [
  {
    id: 1,
    quote_id: 1,
    channel: "zalo",
    sent_by: "Thư ký",
    sent_at: atHour(-16, 9),
    follow_up_ref: "Zalo chị Lan (BQL)",
  },
  {
    id: 2,
    quote_id: 2,
    channel: "zalo",
    sent_by: "Thư ký",
    sent_at: atHour(-12, 9),
    follow_up_ref: "Zalo chị Lan (BQL)",
  },
  {
    id: 3,
    quote_id: 3,
    channel: "email",
    sent_by: "Thư ký",
    sent_at: atHour(-44, 14),
    follow_up_ref: "ketoan@anphat.com.vn",
  },
  {
    id: 4,
    quote_id: 4,
    channel: "print",
    sent_by: "Thư ký",
    sent_at: atHour(-78, 10),
  },
];

const CONTRACTS: Seeded<Prisma.ContractUncheckedCreateInput>[] = [
  {
    id: 1,
    project_id: 6,
    code: "HD-2026-001",
    status: "signed",
    signed_date: day(-28),
    template_id: 2,
    note: "Ký tại văn phòng BQL Toà nhà B.",
  },
  {
    id: 2,
    project_id: 2,
    code: "HD-2026-002",
    status: "signed",
    signed_date: day(-38),
    template_id: 2,
    note: "Đã nhận cọc 60%.",
  },
  {
    id: 3,
    project_id: 7,
    code: "HD-2026-003",
    status: "signed",
    signed_date: day(-44),
    template_id: 1,
  },
  {
    id: 4,
    project_id: 8,
    code: "HD-2026-004",
    status: "signed",
    signed_date: day(-50),
    template_id: 1,
  },
  {
    id: 5,
    project_id: 3,
    code: "HD-2026-005",
    status: "signed",
    signed_date: day(-72),
    template_id: 1,
  },
  // Draft — the contract panel's unsigned row (Đánh dấu đã ký still offered).
  {
    id: 6,
    project_id: 5,
    code: "HD-2026-006",
    status: "draft",
    template_id: 1,
  },
];

// Stage-4 checklist for CT-2026-006 — the 4 auto-seeded defaults. "PCCC" is
// submitted with a past due_date: the derived overdue badge and the dashboard's
// "Hồ sơ quá hạn" panel (GET /paperwork-items?overdue=true) both hang off it.
export const PAPERWORK: Seeded<Prisma.PaperworkItemUncheckedCreateInput>[] = [
  {
    id: 1,
    project_id: 6,
    name: "Giấy phép thi công",
    status: "approved",
    due_date: day(-25),
  },
  {
    id: 2,
    project_id: 6,
    name: "PCCC",
    status: "submitted",
    due_date: day(-4),
    note: "Chờ ban quản lý toà nhà duyệt",
  },
  { id: 3, project_id: 6, name: "Danh sách nhân sự", status: "approved" },
  {
    id: 4,
    project_id: 6,
    name: "Danh sách thiết bị",
    status: "preparing",
    due_date: day(6),
    note: "Chờ hợp đồng thuê xe nâng",
  },
];

export const SETTLEMENTS: Seeded<Prisma.SettlementUncheckedCreateInput>[] = [
  {
    id: 1,
    project_id: 8,
    status: "signed",
    total_amount: 60_000_000n,
    signed_date: day(-7),
    note: "Khối lượng chốt theo biên bản nghiệm thu.",
  },
  {
    id: 2,
    project_id: 3,
    status: "signed",
    total_amount: 34_050_000n,
    signed_date: day(-45),
  },
];

export const SETTLEMENT_ITEMS: Seeded<Prisma.SettlementItemUncheckedCreateInput>[] =
  [
    {
      id: 1,
      settlement_id: 1,
      description: "Vệ sinh kính mặt ngoài (định kỳ)",
      unit: "m²",
      quantity: 2000,
      unit_price: 22_000n,
      amount: 44_000_000n,
    },
    {
      id: 2,
      settlement_id: 1,
      description: "Vệ sinh sảnh và thảm",
      unit: "m²",
      quantity: 400,
      unit_price: 40_000n,
      amount: 16_000_000n,
      sort_order: 1,
    },
    {
      id: 3,
      settlement_id: 2,
      description: "Tháo dỡ nội thất",
      unit: "gói",
      quantity: 1,
      unit_price: 27_000_000n,
      amount: 27_000_000n,
    },
    {
      id: 4,
      settlement_id: 2,
      description: "Vệ sinh hoàn trả mặt bằng",
      unit: "m²",
      quantity: 470,
      unit_price: 15_000n,
      amount: 7_050_000n,
      sort_order: 1,
    },
  ];

// Bills are born with their quyết toán; signing officializes them, so both are
// past `draft`. total_amount mirrors the settlement total and sum(its đợt)
// equals it — the invariant receivables.module.ts maintains on sign.
export const BILLS: Seeded<Prisma.BillUncheckedCreateInput>[] = [
  {
    id: 1,
    project_id: 8,
    settlement_id: 1,
    status: "sent",
    total_amount: 60_000_000n,
    sent_date: day(-6),
  },
  {
    id: 2,
    project_id: 3,
    settlement_id: 2,
    status: "paid",
    total_amount: 34_050_000n,
    sent_date: day(-44),
    paid_date: day(-40),
  },
];

export const MILESTONES: Seeded<Prisma.PaymentMilestoneUncheckedCreateInput>[] =
  [
    // CT-2026-002 — cọc collected at stage 4 (bill_id null: pre-bill) plus a
    // progress đợt past its due date and unpaid → the derived "Quá hạn" the
    // dashboard's Công nợ panel and the receivables overdue-first sort need.
    {
      id: 1,
      project_id: 2,
      type: "deposit",
      amount: 15_000_000n,
      due_date: day(-25),
      status: "paid",
      paid_date: day(-26),
    },
    {
      id: 2,
      project_id: 2,
      type: "progress",
      amount: 20_000_000n,
      due_date: day(-5),
      status: "awaiting_payment",
    },
    // CT-2026-005 — cọc still awaiting: paying it would advance the project out
    // of stage 3 (receivables.module.ts), which is where we want it.
    {
      id: 3,
      project_id: 5,
      type: "deposit",
      amount: 26_400_000n,
      due_date: day(5),
      status: "awaiting_payment",
    },
    {
      id: 4,
      project_id: 6,
      type: "deposit",
      amount: 36_000_000n,
      due_date: day(-26),
      status: "paid",
      paid_date: day(-25),
    },
    // CT-2026-008 — allocated to bill 1 (signing sweeps every cọc onto the
    // bill). The paid progress đợt is what blocks un-signing the quyết toán.
    {
      id: 5,
      project_id: 8,
      bill_id: 1,
      type: "deposit",
      amount: 20_000_000n,
      due_date: day(-40),
      status: "paid",
      paid_date: day(-39),
    },
    {
      id: 6,
      project_id: 8,
      bill_id: 1,
      type: "progress",
      amount: 25_000_000n,
      due_date: day(-20),
      status: "paid",
      paid_date: day(-19),
    },
    {
      id: 7,
      project_id: 8,
      bill_id: 1,
      type: "acceptance",
      amount: 15_000_000n,
      due_date: day(15),
      status: "not_due",
    },
    // CT-2026-003 — đã đóng, fully collected via bill 2.
    {
      id: 8,
      project_id: 3,
      bill_id: 2,
      type: "deposit",
      amount: 10_000_000n,
      due_date: day(-60),
      status: "paid",
      paid_date: day(-59),
    },
    {
      id: 9,
      project_id: 3,
      bill_id: 2,
      type: "progress",
      amount: 24_050_000n,
      due_date: day(-46),
      status: "paid",
      paid_date: day(-40),
    },
  ];

// `role_name` → id at write time, same reason as CrewMember.default_role_name.
type SeededAssignment = Seeded<Prisma.AssignmentUncheckedCreateInput> & {
  role_name: string | null;
};

// Member 1 is booked twice on CT-2026-002 (the panel's "Trùng lịch trong công
// trình") and again on CT-2026-007 over overlapping dates (the cross-project
// overlap the API computes on write).
export const ASSIGNMENTS: SeededAssignment[] = [
  {
    id: 1,
    project_id: 2,
    crew_member_id: 1,
    role_name: "Giám sát",
    from_date: day(-19),
  },
  {
    id: 2,
    project_id: 2,
    crew_member_id: 2,
    role_name: "Thợ chính",
    from_date: day(-19),
    to_date: day(10),
  },
  {
    id: 3,
    project_id: 2,
    crew_member_id: 3,
    role_name: null,
    from_date: day(-17),
    to_date: day(-7),
  },
  {
    id: 4,
    project_id: 2,
    crew_member_id: 1,
    role_name: "Thợ phụ",
    from_date: day(-3),
    to_date: day(5),
  },
  {
    id: 5,
    project_id: 7,
    crew_member_id: 1,
    role_name: "Giám sát",
    from_date: day(-8),
    to_date: day(-1),
  },
];

// All on CT-2026-002, inside [start_date, today] so the panel's window sees
// them. Manual is source of truth; the zalo_app row on day -5 coexists with the
// manual one for the same member+day — that collision is the grid's cell logic.
// 3 distinct work_dates vs actual_duration_days 5 also drives the "Xem chênh
// lệch" warning.
export const TIMEKEEPING: Seeded<Prisma.TimekeepingRecordUncheckedCreateInput>[] =
  [
    {
      id: 1,
      crew_member_id: 1,
      project_id: 2,
      work_date: day(-6),
      hours: 8,
      source: "manual",
    },
    {
      id: 2,
      crew_member_id: 2,
      project_id: 2,
      work_date: day(-6),
      hours: 8,
      source: "manual",
    },
    {
      id: 3,
      crew_member_id: 2,
      project_id: 2,
      work_date: day(-5),
      hours: 6.5,
      source: "manual",
      note: "Về sớm — chờ vật tư.",
    },
    {
      id: 4,
      crew_member_id: 2,
      project_id: 2,
      work_date: day(-5),
      hours: 7,
      source: "zalo_app",
    },
    {
      id: 5,
      crew_member_id: 1,
      project_id: 2,
      work_date: day(-4),
      hours: 8,
      source: "manual",
    },
  ];

// Metadata only — no upload. s3_key doubles as the display filename.
const ATTACHMENTS: Seeded<Prisma.AttachmentUncheckedCreateInput>[] = [
  {
    id: 1,
    project_id: 1,
    kind: "survey",
    s3_key: "mat-ngoai-1.jpg",
    note: "vết ố tầng 5",
  },
  {
    id: 2,
    project_id: 1,
    kind: "survey",
    s3_key: "mat-ngoai-2.jpg",
    note: "khu vực cần xe nâng",
  },
  { id: 3, project_id: 1, kind: "survey", s3_key: "sanh-chinh.jpg" },
  { id: 4, project_id: 2, kind: "site_log", s3_key: "nhat-ky-ngay-1.jpg" },
  {
    id: 5,
    project_id: 3,
    kind: "acceptance_report",
    s3_key: "bien-ban-nghiem-thu.pdf",
  },
  { id: 6, project_id: 3, kind: "finish_image", s3_key: "hoan-thien-sanh.jpg" },
  { id: 7, project_id: 6, kind: "paperwork", s3_key: "pccc-ho-so.pdf" },
];

// `tag: "rework"` notes are the nghiệm thu history the acceptance and closed
// panels count.
const NOTES: Seeded<Prisma.ProjectNoteUncheckedCreateInput>[] = [
  {
    id: 1,
    project_id: 2,
    tag: "kickoff",
    body: "Khởi công: đã họp BQL, giờ làm 8h-17h, dùng thang máy hàng.",
  },
  {
    id: 2,
    project_id: 7,
    tag: "rework",
    body: "Bổ sung: làm lại đường keo silicon mặt kính tầng 2.",
  },
  {
    id: 3,
    project_id: 3,
    tag: "rework",
    body: "Bổ sung: vệ sinh lại sàn tầng 1 sau khi tháo giàn giáo.",
  },
];

// ── Writers ────────────────────────────────────────────────────────────────
/** Upsert rows on their explicit id — the converging re-run (see header). */
async function seedById<R>(
  model: {
    upsert(args: {
      where: { id: number };
      create: R;
      update: R;
    }): Promise<unknown>;
  },
  rows: Seeded<R>[]
): Promise<void> {
  for (const row of rows)
    await model.upsert({ where: { id: row.id }, create: row, update: row });
}

// Explicit ids leave every autoincrement sequence parked at 1, so the app's
// first insert would collide with a seeded row (and nextCode() would reissue a
// seeded code). Park each sequence just past the seeded block instead.
async function resetSequences(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE tbl text; seq text; hi bigint;
    BEGIN
      FOR tbl IN SELECT table_name FROM information_schema.columns
                 WHERE table_schema = 'public' AND column_name = 'id'
      LOOP
        seq := pg_get_serial_sequence(quote_ident(tbl), 'id');
        IF seq IS NOT NULL THEN
          EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', tbl) INTO hi;
          PERFORM setval(seq, hi + 1, false);
        END IF;
      END LOOP;
    END $$;
  `);
}

async function main(): Promise<void> {
  const username = process.env.SEED_USER ?? "admin";
  const password = process.env.SEED_PASSWORD ?? "admin";
  await prisma.user.upsert({
    where: { username },
    update: { hashed_password: await hash(password), disabled: false },
    create: {
      username,
      hashed_password: await hash(password),
      full_name: "Quản trị viên",
    },
  });

  for (const name of PROJECT_TYPES)
    await prisma.projectType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  for (const name of CREW_ROLES)
    await prisma.crewRole.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  const roleId = new Map(
    (await prisma.crewRole.findMany()).map((r) => [r.name, r.id])
  );

  await seedById(prisma.client, CLIENTS);
  await seedById(prisma.contact, CONTACTS);
  await seedById(prisma.location, LOCATIONS);
  await seedById(prisma.contractTemplate, CONTRACT_TEMPLATES);

  for (const { default_role_name, ...row } of CREW) {
    const data = { ...row, default_role_id: roleId.get(default_role_name) };
    await prisma.crewMember.upsert({
      where: { id: row.id },
      create: data,
      update: data,
    });
  }

  // A closed project is locked (common/project-lock.ts), so it is seeded one
  // stage short and closed at the end — the order a human would have to use.
  const closedCodes = PROJECTS.filter((p) => p.stage === "closed").map(
    (p) => p.code
  );
  for (const { type_names, ...row } of PROJECTS) {
    const data = {
      ...row,
      stage: row.stage === "closed" ? "settlement" : row.stage,
    };
    const types = type_names.map((name) => ({ name }));
    await prisma.project.upsert({
      where: { id: row.id },
      create: { ...data, types: { connect: types } },
      // `set` (not `connect`) so a re-run converges instead of re-inserting
      // into the implicit m2m join table.
      update: { ...data, types: { set: types } },
    });
  }

  await seedById(prisma.quote, QUOTES);
  await seedById(prisma.quoteItem, QUOTE_ITEMS);
  await seedById(prisma.quoteSendLog, QUOTE_SEND_LOGS);
  await seedById(prisma.contract, CONTRACTS);
  await seedById(prisma.paperworkItem, PAPERWORK);
  await seedById(prisma.settlement, SETTLEMENTS);
  await seedById(prisma.settlementItem, SETTLEMENT_ITEMS);
  await seedById(prisma.bill, BILLS);
  await seedById(prisma.paymentMilestone, MILESTONES);
  await seedById(prisma.timekeepingRecord, TIMEKEEPING);
  await seedById(prisma.attachment, ATTACHMENTS);
  await seedById(prisma.projectNote, NOTES);

  for (const { role_name, ...row } of ASSIGNMENTS) {
    const data = {
      ...row,
      role_id: role_name === null ? null : roleId.get(role_name),
    };
    await prisma.assignment.upsert({
      where: { id: row.id },
      create: data,
      update: data,
    });
  }

  await prisma.project.updateMany({
    where: { code: { in: closedCodes } },
    data: { stage: "closed" },
  });

  await resetSequences();

  console.log(
    `✓ Seeded crm_nest: ${PROJECTS.length} công trình (one per stage ` +
      `plus one parked), ` +
      `${QUOTES.length} báo giá, ${CONTRACTS.length} hợp đồng, ` +
      `${SETTLEMENTS.length} quyết toán, ${BILLS.length} hóa đơn, ` +
      `${MILESTONES.length} đợt thanh toán, ${CREW.length} nhân sự. ` +
      `Hẹn hôm nay: ${PROJECTS.find((p) => p.stage === "request")?.code}.`
  );
}

// Guarded so seed.test.ts can import the fixtures without hitting the DB.
if (require.main === module)
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
