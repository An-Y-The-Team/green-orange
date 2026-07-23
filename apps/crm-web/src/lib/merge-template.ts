/**
 * Contract merge tokens — the catalog of merge fields and the context builders
 * that resolve them against a contract (or sample values).
 *
 * Pure module (no React, no IO) so it runs in two places unchanged:
 *   • the print page ([id]/page.tsx) — server-side, against a real Contract;
 *   • the editor preview — client-side, against sample values.
 *
 * The merge itself is node-level: merge-field nodes in a Lexical `body` are
 * resolved against a MergeContext by components/editor/lexical-document.tsx.
 *
 * v2: the contract no longer carries party/value fields — the client comes from
 * the embedded project relation and the money tokens derive from the project's
 * chốt (deal) quote, passed alongside the contract.
 */
import type { Contract } from "@/app/(dashboard)/contracts/types";
import type { Quote } from "@/app/(dashboard)/quotes/types";
import { company } from "@/config/company";
import { formatDate, formatVND } from "@/lib/format";
import { vndInWords } from "@/lib/vnd-in-words";

/** Default VAT rate when no quote pins one. */
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
  { token: "project_code", label: "Mã công trình", example: "CT-2026-001" },
  {
    token: "project_name",
    label: "Tên công trình",
    example: "Vệ sinh kính mặt ngoài Vincom Plaza Q.1",
  },
  { token: "signed_date", label: "Ngày ký", example: "10/03/2026" },
  {
    token: "note",
    label: "Ghi chú hợp đồng",
    example: "Ký tại văn phòng BQL.",
  },
  // Bên A — Party A (client, from the project)
  { token: "client", label: "Bên A: Tên", example: "Vincom Retail" },
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
  // Tài chính — from the chốt quote (total_amount is before VAT)
  { token: "value", label: "Giá trị (đã gồm VAT)", example: "38.880.000 ₫" },
  {
    token: "value_before_tax",
    label: "Giá trị trước thuế",
    example: "36.000.000 ₫",
  },
  { token: "vat_rate", label: "Thuế suất VAT", example: "8%" },
  { token: "vat_amount", label: "Tiền thuế VAT", example: "2.880.000 ₫" },
  {
    token: "value_in_words",
    label: "Giá trị bằng chữ",
    example: "Ba mươi tám triệu tám trăm tám mươi nghìn đồng",
  },
] as const;

export type MergeContext = Record<string, string>;

/**
 * Real merge values for a contract — formatting (VND, dates) applied here.
 * `quote` is the project's chốt quote (drives the money tokens); when absent
 * the money tokens resolve to empty strings.
 */
export function buildContractContext(
  contract: Contract,
  quote?: Pick<Quote, "total_amount" | "vat_rate"> | null
): MergeContext {
  const beforeTax = quote?.total_amount;
  const vatRate = quote?.vat_rate ?? DEFAULT_VAT_RATE;
  const vatAmount =
    beforeTax === undefined ? undefined : Math.round(beforeTax * vatRate);
  const total =
    beforeTax === undefined ? undefined : beforeTax + (vatAmount ?? 0);

  return {
    code: contract.code,
    project_code: contract.project?.code ?? "",
    project_name: contract.project?.name ?? "",
    signed_date: contract.signed_date ? formatDate(contract.signed_date) : "",
    note: contract.note ?? "",
    // Bên A
    client: contract.project?.client.name ?? "",
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
    value: total === undefined ? "" : formatVND(total),
    value_before_tax: beforeTax === undefined ? "" : formatVND(beforeTax),
    vat_rate: `${Math.round(vatRate * 100)}%`,
    vat_amount: vatAmount === undefined ? "" : formatVND(vatAmount),
    value_in_words: total === undefined ? "" : vndInWords(total),
  };
}

/** Stand-in values for the editor preview, derived from the token examples. */
export function previewContext(): MergeContext {
  return Object.fromEntries(CONTRACT_TOKENS.map((t) => [t.token, t.example]));
}
