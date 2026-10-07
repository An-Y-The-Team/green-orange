// The POST /projects/import body (crm-api-nest projects/project-import.ts,
// crm-api app/models/project_import.py), checked at the server-action boundary
// before it is forwarded.
import { z } from "zod";

import { ClientType } from "@/app/(dashboard)/clients/enums";

import { ProjectStage } from "../enums";

const ref = z.object({ id: z.number().int().positive() });

const item = z.object({
  category: z.string().optional(),
  description: z.string().min(1),
  unit: z.string().optional(),
  quantity: z.number().min(0),
  unit_price: z.number().int().min(0),
});

const money = z.object({
  items: z.array(item).min(1),
  vat_rate: z.number().min(0).max(1),
  discount_amount: z.number().int().min(0).optional(),
});

/** A workbook always carries a priced quote: never "request", never "closed". */
export const IMPORT_STAGES = Object.values(ProjectStage).filter(
  (s) => s !== ProjectStage.REQUEST && s !== ProjectStage.CLOSED
);

export const importProjectSchema = z.object({
  client: z.union([
    ref,
    z.object({
      name: z.string().min(1),
      type: z.nativeEnum(ClientType),
      tax_code: z.string().optional(),
      address: z.string().optional(),
    }),
  ]),
  contact: z
    .union([
      ref,
      z.object({
        name: z.string().min(1),
        title: z.string().optional(),
        phone: z.string().optional(),
      }),
    ])
    .optional(),
  location: z.union([
    ref,
    z.object({ name: z.string().min(1), address: z.string().min(1) }),
  ]),
  name: z.string().min(1),
  type_ids: z.array(z.number().int().positive()).min(1),
  stage: z.enum(IMPORT_STAGES as [ProjectStage, ...ProjectStage[]]),
  request_note: z.string().optional(),
  quote: money,
  settlement: money.optional(),
});

export type ImportProjectBody = z.infer<typeof importProjectSchema>;

export const importRequestSchema = z
  .array(z.object({ key: z.string().min(1), body: importProjectSchema }))
  .min(1);
