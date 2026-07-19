import { z } from "zod";

import { ClientStatus } from "./enums";

// Single source of truth for client form validation. Imported by the server
// actions (add/update) for server-side validation; the same shape is what
// POST/PATCH /clients accept on the backend (a student exercise). Keeping it
// here (not in the dialog) lets every client action reuse it.
export const clientSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  phone: z.string().min(6, "Số điện thoại không hợp lệ"),
  company: z.string().min(1, "Vui lòng nhập công ty"),
  status: z.nativeEnum(ClientStatus),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
