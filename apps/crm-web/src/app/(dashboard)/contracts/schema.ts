import { z } from "zod";

import { lexicalPlainText } from "@/lib/lexical-build";

import { ContractStatus } from "./enums";

// Hợp đồng form schema — shared by the dialog and the add-contract action.
export const contractSchema = z.object({
  title: z.string().min(3, "Tiêu đề phải có ít nhất 3 ký tự"),
  client: z.string().min(1, "Vui lòng nhập khách hàng"),
  project_code: z.string().min(1, "Vui lòng nhập mã công trình"),
  value: z.coerce.number().min(0, "Giá trị không hợp lệ"),
  signed_date: z.string().min(1, "Chọn ngày ký"),
  start_date: z.string().min(1, "Chọn ngày bắt đầu"),
  end_date: z.string().min(1, "Chọn ngày kết thúc"),
  status: z.nativeEnum(ContractStatus),
  payment_terms: z.string().min(1, "Nhập điều khoản thanh toán"),
  // Optional printable template. The empty string from the "no template" <option>
  // is normalised to undefined before the positive-int check.
  template_id: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
    z.number().int().positive().optional()
  ),
  // Rich-text clause prose (Lexical JSON, string form). Seeded from the template
  // on create and edited per contract; optional so contracts can be saved before
  // the body is authored. Stored as an opaque string — no server-side parsing.
  body: z.string().optional(),
});
export type ContractFormValues = z.infer<typeof contractSchema>;

// Mẫu hợp đồng form schema — shared by the template editor and its save action.
export const contractTemplateSchema = z.object({
  name: z.string().min(3, "Tên mẫu phải có ít nhất 3 ký tự"),
  doc_title: z.string().min(3, "Tiêu đề tài liệu phải có ít nhất 3 ký tự"),
  // Lexical editorState JSON (string form). The old min-length char check is
  // meaningless against serialised JSON (an empty doc is already long), so
  // validate real content via extracted plain text instead.
  body: z
    .string()
    .refine(
      (v) => lexicalPlainText(v).length > 0,
      "Nội dung mẫu không được để trống"
    ),
  header_style: z.enum(["letterhead", "national"]).default("letterhead"),
  is_active: z.coerce.boolean(),
});
export type ContractTemplateFormValues = z.infer<typeof contractTemplateSchema>;

// Per-contract rich body — edited on the contract edit page.
export const contractBodySchema = z.object({
  body: z
    .string()
    .refine(
      (v) => lexicalPlainText(v).length > 0,
      "Nội dung không được để trống"
    ),
});
export type ContractBodyFormValues = z.infer<typeof contractBodySchema>;
