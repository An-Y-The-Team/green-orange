/**
 * Contract template merge engine — turns a template body full of {{tokens}}
 * into finished document text by substituting a contract's data.
 *
 * This is a pure module (no React, no IO) so it runs in two places unchanged:
 *   • the print page ([id]/page.tsx) — server-side, against a real Contract;
 *   • the template editor preview — client-side, against sample values.
 *
 * SAFETY: this only produces a *string*. It is rendered as escaped text by
 * <ContractDocumentBody>, never via dangerouslySetInnerHTML — so an author
 * cannot inject markup through a template body.
 */
import { company } from "@/config/company";
import { formatDate, formatVND } from "@/lib/format";
import type { Contract } from "@/types";

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
  { token: "customer", label: "Khách hàng", example: "Vincom Retail" },
  { token: "project_code", label: "Mã công trình", example: "CT-2026-001" },
  { token: "value", label: "Giá trị (₫)", example: "450.360.000 ₫" },
  { token: "signed_date", label: "Ngày ký", example: "10/03/2026" },
  { token: "start_date", label: "Ngày bắt đầu", example: "15/03/2026" },
  { token: "end_date", label: "Ngày kết thúc", example: "30/06/2026" },
  {
    token: "payment_terms",
    label: "Điều khoản thanh toán",
    example: "Tạm ứng 30% khi ký hợp đồng…",
  },
  { token: "company.name", label: "Tên công ty", example: company.name },
  {
    token: "company.address",
    label: "Địa chỉ công ty",
    example: company.address,
  },
  { token: "company.tax_id", label: "MST công ty", example: company.tax_id },
  {
    token: "company.phone",
    label: "Điện thoại công ty",
    example: company.phone,
  },
  { token: "company.email", label: "Email công ty", example: company.email },
] as const;

export type MergeContext = Record<string, string>;

/** Real merge values for a given contract — formatting (VND, dates) applied here. */
export function buildContractContext(contract: Contract): MergeContext {
  return {
    code: contract.code,
    title: contract.title,
    customer: contract.customer,
    project_code: contract.project_code,
    value: formatVND(contract.value),
    signed_date: formatDate(contract.signed_date),
    start_date: formatDate(contract.start_date),
    end_date: formatDate(contract.end_date),
    payment_terms: contract.payment_terms,
    "company.name": company.name,
    "company.address": company.address,
    "company.tax_id": company.tax_id,
    "company.phone": company.phone,
    "company.email": company.email,
  };
}

/** Stand-in values for the editor preview, derived from the token examples. */
export function previewContext(): MergeContext {
  return Object.fromEntries(CONTRACT_TOKENS.map((t) => [t.token, t.example]));
}

const TOKEN_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

/**
 * Replace every {{token}} in `body` with its value from `ctx`. An unknown token
 * is left visible as ⟨token?⟩ rather than blanked, so authors catch typos
 * instead of silently shipping an empty clause.
 */
export function mergeTemplate(body: string, ctx: MergeContext): string {
  return body.replace(TOKEN_RE, (_match, token: string) =>
    token in ctx ? ctx[token] : `⟨${token}?⟩`
  );
}
