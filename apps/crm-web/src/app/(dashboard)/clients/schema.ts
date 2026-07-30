import { z } from "zod";

import { ClientType } from "./enums";

const clientEmail = z
  .union([z.string().email("Email không hợp lệ"), z.literal("")])
  .optional();

export const createClientSchema = z
  .object({
    name: z.string().min(1),
    type: z.nativeEnum(ClientType),
    email: clientEmail,
    address: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    // Individual clients need an address — the backend derives their default
    // location/contact from it.
    if (val.type === ClientType.INDIVIDUAL && !val.address?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["address"],
        message: "Vui lòng nhập địa chỉ cho khách cá nhân.",
      });
    }
  });

export type CreateClientFormValues = z.infer<typeof createClientSchema>;

// Inline edits on the detail page (crm-ui-redesign.md: pages/inline, no modals).
export const updateClientSchema = z.object({
  name: z.string().min(1),
  tax_code: z.string().optional(),
  email: clientEmail,
  note: z.string().optional(),
});
export type UpdateClientFormValues = z.infer<typeof updateClientSchema>;

export const contactSchema = z.object({
  name: z.string().min(1, "Nhập tên liên hệ"),
  phone: z.string().optional(),
  // Empty allowed; validated as an email only when present (backend @IsEmail).
  email: z
    .union([z.string().email("Email không hợp lệ"), z.literal("")])
    .optional(),
  title: z.string().optional(),
});
export type ContactFormValues = z.infer<typeof contactSchema>;

export const locationSchema = z.object({
  name: z.string().min(1, "Nhập tên địa điểm"),
  address: z.string().min(1, "Nhập địa chỉ"),
  manager_contact_id: z.number().int().positive().nullable().optional(),
});
export type LocationFormValues = z.infer<typeof locationSchema>;
