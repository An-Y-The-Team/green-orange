/**
 * Contract merge tokens — the catalog of merge fields and the context builders
 * that resolve them against a contract (or sample values).
 *
 * Pure module (no React, no IO) so it runs in two places unchanged:
 *   • the print page ([id]/page.tsx) — server-side, against a real Contract;
 *   • the editor preview — client-side, against sample values.
 *
 * The merge itself is now node-level: merge-field nodes in a Lexical `body` are
 * resolved against a MergeContext by components/editor/lexical-document.tsx.
 */
import type { Contract } from "@/app/(dashboard)/contracts/types";
import { company } from "@/config/company";
import { formatDate, formatVND } from "@/lib/format";
import { vndInWords } from "@/lib/vnd-in-words";

/** Default VAT rate when a contract doesn't pin its own. */
export const DEFAULT_VAT_RATE = 0.08;

/**
 * The whitelist of tokens an author may use, with a human label (for the editor
 * palette) and an example (for the editor's live preview). This list is the
 * single source of truth: {@link buildContractContext} must produce a value for
 * every `token` here, and the editor renders one chip per entry.
 */
export const CONTRACT_TOKENS: ReadonlyArray<{
  token: string;
  label: string;
  example: string;
}> = [
  { token: "code", label: "Mã hợp đồng", example: "HD-2026-001" },
  { token: "title", label: "Tiêu đề", example: "Hợp đồng vệ sinh tổng thể" },
  { token: "project_code", label: "Mã công trình", example: "CT-2026-001" },
  { token: "signed_date", label: "Ngày ký", example: "10/03/2026" },
  { token: "start_date", label: "Ngày bắt đầu", example: "15/03/2026" },
  { token: "end_date", label: "Ngày kết thúc", example: "30/06/2026" },
  {
    token: "payment_terms",
    label: "Điều khoản thanh toán",
    example: "Tạm ứng 30% khi ký hợp đồng…",
  },
  // Bên A — Party A (customer)
  { token: "customer", label: "Bên A: Tên", example: "Vincom Retail" },
  {
    token: "customer_address",
    label: "Bên A: Địa chỉ",
    example: "72 Lê Thánh Tôn, P. Sài Gòn, TP.HCM",
  },
  {
    token: "customer_tax_code",
    label: "Bên A: MST",
    example: "0311945734",
  },
  {
    token: "customer_rep",
    label: "Bên A: Đại diện",
    example: "Trần Thị B",
  },
  {
    token: "customer_position",
    label: "Bên A: Chức vụ",
    example: "Giám đốc",
  },
  {
    token: "customer_phone",
    label: "Bên A: Điện thoại",
    example: "028 1234 5678",
  },
  // Bên B — Party B (our company)
  { token: "company.name", label: "Bên B: Tên", example: company.name },
  {
    token: "company.address",
    label: "Bên B: Địa chỉ",
    example: company.address,
  },
  { token: "company.tax_id", label: "Bên B: MST", example: company.tax_id },
  {
    token: "company.phone",
    label: "Bên B: Điện thoại",
    example: company.phone,
  },
  { token: "company.email", label: "Bên B: Email", example: company.email },
  {
    token: "company.rep",
    label: "Bên B: Đại diện",
    example: company.representative,
  },
  {
    token: "company.rep_title",
    label: "Bên B: Chức vụ",
    example: company.representative_title,
  },
  {
    token: "company.bank_account",
    label: "Bên B: Số tài khoản",
    example: company.bank_account,
  },
  {
    token: "company.bank_name",
    label: "Bên B: Ngân hàng",
    example: company.bank_name,
  },
  {
    token: "company.bank_branch",
    label: "Bên B: Chi nhánh/PGD",
    example: company.bank_branch,
  },
  // Tài chính — financial breakdown
  { token: "value", label: "Giá trị (đã gồm VAT)", example: "81.307.800 ₫" },
  {
    token: "value_before_tax",
    label: "Giá trị trước thuế",
    example: "75.285.000 ₫",
  },
  { token: "vat_rate", label: "Thuế suất VAT", example: "8%" },
  { token: "vat_amount", label: "Tiền thuế VAT", example: "6.022.000 ₫" },
  {
    token: "value_in_words",
    label: "Giá trị bằng chữ",
    example: "Tám mươi mốt triệu ba trăm lẻ bảy nghìn tám trăm đồng",
  },
] as const;

export type MergeContext = Record<string, string>;

/** Real merge values for a given contract — formatting (VND, dates) applied here. */
export function buildContractContext(contract: Contract): MergeContext {
  // `value` is the VAT-inclusive contract total (as in the printed document);
  // derive the before-tax base and VAT amount from the rate.
  const vatRate = contract.vat_rate ?? DEFAULT_VAT_RATE;
  const beforeTax = Math.round(contract.value / (1 + vatRate));
  const vatAmount = contract.value - beforeTax;

  return {
    code: contract.code,
    title: contract.title,
    project_code: contract.project_code,
    signed_date: formatDate(contract.signed_date),
    start_date: formatDate(contract.start_date),
    end_date: formatDate(contract.end_date),
    payment_terms: contract.payment_terms,
    // Bên A
    customer: contract.customer,
    customer_address: contract.customer_address ?? "",
    customer_tax_code: contract.customer_tax_code ?? "",
    customer_rep: contract.customer_rep ?? "",
    customer_position: contract.customer_position ?? "",
    customer_phone: contract.customer_phone ?? "",
    // Bên B
    "company.name": company.name,
    "company.address": company.address,
    "company.tax_id": company.tax_id,
    "company.phone": company.phone,
    "company.email": company.email,
    "company.rep": company.representative,
    "company.rep_title": company.representative_title,
    "company.bank_account": company.bank_account,
    "company.bank_name": company.bank_name,
    "company.bank_branch": company.bank_branch,
    // Tài chính
    value: formatVND(contract.value),
    value_before_tax: formatVND(beforeTax),
    vat_rate: `${Math.round(vatRate * 100)}%`,
    vat_amount: formatVND(vatAmount),
    value_in_words: vndInWords(contract.value),
  };
}

/** Stand-in values for the editor preview, derived from the token examples. */
export function previewContext(): MergeContext {
  return Object.fromEntries(CONTRACT_TOKENS.map((t) => [t.token, t.example]));
}
