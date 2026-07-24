import { z } from "zod";

import { ClientType } from "./enums";

export const createClientSchema = z
  .object({
    name: z.string().min(1),
    type: z.nativeEnum(ClientType),
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
