import { z } from "zod";

import { lexicalPlainText } from "@/utils/lexical-build/lexical-build";

// Mẫu hợp đồng form schema — shared by the template editor and its save action.
// (The v1 contract create/edit schemas are gone — contracts are created from a
// project in the v2 flow; phase 1 is read-only.)
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
  show_letterhead: z.coerce.boolean().default(true),
  show_national: z.coerce.boolean().default(true),
  is_active: z.coerce.boolean(),
});
export type ContractTemplateFormValues = z.infer<typeof contractTemplateSchema>;

// Hợp đồng create/edit — contracts are born from a project (stage-4 panel).
// The template body is pre-filled into `body` client-side (the server never
// copies it), so `body` is a plain optional editorState string here.
// Signature footer signer lines — null clears one (B side then falls back to
// the company representative).
const repFields = {
  rep_a_label: z.string().nullable().optional(),
  rep_a_name: z.string().nullable().optional(),
  rep_a_title: z.string().nullable().optional(),
  rep_b_label: z.string().nullable().optional(),
  rep_b_name: z.string().nullable().optional(),
  rep_b_title: z.string().nullable().optional(),
};

export const createContractSchema = z.object({
  project_id: z.number().int().positive().optional(), // optional = standalone
  template_id: z.number().int().positive().optional(),
  body: z.string().optional(),
  note: z.string().optional(),
  ...repFields,
});
export type CreateContractFormValues = z.infer<typeof createContractSchema>;

export const updateContractSchema = z.object({
  template_id: z.number().int().positive().optional(),
  body: z.string().optional(),
  note: z.string().optional(),
  ...repFields,
});
export type UpdateContractFormValues = z.infer<typeof updateContractSchema>;
