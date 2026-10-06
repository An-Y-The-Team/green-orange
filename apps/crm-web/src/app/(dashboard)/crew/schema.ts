import { z } from "zod";

import { CrewMemberStatus, EmploymentType } from "./enums";

// Số điện thoại is the Zalo mini app's login identity: the API normalizes it to
// the canonical "0…" ten-digit form and matches it exactly, so a number that
// cannot be read that way produces a worker who can never log in — with nothing
// visibly wrong on the roster. Caught here so the operator sees it on the field
// rather than as a server error after saving.
const VN_MOBILE = /^(0|\+?84)\d{9}$/;

// POST /crew — name required, everything else optional/defaulted by the API.
export const createCrewMemberSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập họ tên."),
  phone: z
    .string()
    .optional()
    .refine(
      (v) => !v || VN_MOBILE.test(v.replace(/[\s.-]/g, "")),
      "Số điện thoại phải là số di động Việt Nam, ví dụ 0901234567."
    ),
  employment_type: z.nativeEnum(EmploymentType),
  default_role_id: z.number().int().positive().optional(),
  status: z.nativeEnum(CrewMemberStatus).optional(),
  note: z.string().optional(),
});

export type CreateCrewMemberFormValues = z.infer<typeof createCrewMemberSchema>;

// PATCH /crew/:id — every field optional; also drives the "Nghỉ việc"
// shortcut ({ status: "left" }).
export const updateCrewMemberSchema = createCrewMemberSchema.partial();
export type UpdateCrewMemberFormValues = z.infer<typeof updateCrewMemberSchema>;
