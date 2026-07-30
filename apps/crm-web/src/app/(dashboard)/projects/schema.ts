import { z } from "zod";

import { ClientType } from "../clients/enums";
import { ProjectStage } from "./enums";

// Quick-create client from the intake form. A company needs a first contact +
// location (the intake form requires location_id and selects a working
// contact); an individual only needs an address — the backend derives its
// single location/contact from it.
export const quickClientSchema = z
  .object({
    name: z.string().min(1, "Nhập tên khách hàng"),
    type: z.nativeEnum(ClientType),
    address: z.string().optional(),
    contact_name: z.string().optional(),
    contact_phone: z.string().optional(),
    location_name: z.string().optional(),
    location_address: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === ClientType.INDIVIDUAL) {
      if (!v.address?.trim())
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["address"],
          message: "Vui lòng nhập địa chỉ cho khách cá nhân.",
        });
      return;
    }
    if (!v.contact_name?.trim())
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contact_name"],
        message: "Nhập tên người liên hệ.",
      });
    if (!v.location_name?.trim())
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["location_name"],
        message: "Nhập tên địa điểm.",
      });
    if (!v.location_address?.trim())
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["location_address"],
        message: "Nhập địa chỉ địa điểm.",
      });
  });

export type QuickClientFormValues = z.infer<typeof quickClientSchema>;

export const createProjectSchema = z.object({
  client_id: z.number().int().positive(),
  location_id: z.number().int().positive(),
  working_contact_id: z.number().int().positive().optional(),
  decision_maker_contact_id: z.number().int().positive().optional(),
  name: z.string().min(1),
  type_ids: z.array(z.number().int().positive()).min(1),
  // Starting stage — default Yêu cầu. Direct create / pre-CRM backfill can
  // start mid-pipeline; stage-1 fields below are only sent for REQUEST.
  stage: z.nativeEnum(ProjectStage).default(ProjectStage.REQUEST),
  request_note: z.string().optional(),
  referral_source: z.string().optional(),
  appointment_at: z.string().optional(),
});

export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;
