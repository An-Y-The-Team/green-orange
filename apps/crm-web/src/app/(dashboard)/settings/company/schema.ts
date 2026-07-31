import { z } from "zod";

// Company profile form — every field optional; null clears one back to the
// built-in COMPANY default.
const field = z.string().nullable().optional();
export const updateCompanySchema = z.object({
  name: field,
  tagline: field,
  address: field,
  phone: field,
  email: field,
  tax_id: field,
  website: field,
  representative: field,
  representative_title: field,
  bank_account: field,
  bank_name: field,
  bank_branch: field,
  // Rich-text header templates (Lexical editorState JSON); null = built-in.
  letterhead_body: field,
  national_body: field,
  // Logo as a data URL; null clears it.
  logo: field,
});
export type UpdateCompanyFormValues = z.infer<typeof updateCompanySchema>;
