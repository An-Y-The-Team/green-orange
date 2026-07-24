import { z } from "zod";

import { lexicalPlainText } from "@/lib/lexical-build";

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
  header_style: z.enum(["letterhead", "national"]).default("letterhead"),
  is_active: z.coerce.boolean(),
});
export type ContractTemplateFormValues = z.infer<typeof contractTemplateSchema>;

// Hợp đồng create/edit — contracts are born from a project (stage-4 panel).
// The template body is pre-filled into `body` client-side (the server never
// copies it), so `body` is a plain optional editorState string here.
export const createContractSchema = z.object({
  project_id: z.number().int().positive().optional(), // optional = standalone
  template_id: z.number().int().positive().optional(),
  body: z.string().optional(),
  note: z.string().optional(),
});
export type CreateContractFormValues = z.infer<typeof createContractSchema>;

export const updateContractSchema = z.object({
  template_id: z.number().int().positive().optional(),
  body: z.string().optional(),
  note: z.string().optional(),
});
export type UpdateContractFormValues = z.infer<typeof updateContractSchema>;
