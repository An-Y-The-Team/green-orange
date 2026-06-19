import { z } from "zod";

import { CustomerStatus } from "./enums";

// Single source of truth for customer form validation. Imported by the server
// actions (add/update) for server-side validation; the same shape is what
// POST/PATCH /customers accept on the backend (a student exercise). Keeping it
// here (not in the dialog) lets every customer action reuse it.
export const customerSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  phone: z.string().min(6, "Số điện thoại không hợp lệ"),
  company: z.string().min(1, "Vui lòng nhập công ty"),
  status: z.nativeEnum(CustomerStatus),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
