import { z } from "zod";

import { CrewMemberStatus, EmploymentType } from "./enums";

// POST /crew — name required, everything else optional/defaulted by the API.
export const createCrewMemberSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập họ tên."),
  phone: z.string().optional(),
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
