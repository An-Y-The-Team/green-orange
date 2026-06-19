import { z } from "zod";

import { CrewRole, CrewStatus } from "./enums";

// Single source of truth for crew form validation. Imported by the server
// actions (add/update) for server-side validation; the same shape is what
// POST/PATCH /crew would accept on the backend. Mirrors the customers schema.
export const crewSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  phone: z.string().min(6, "Số điện thoại không hợp lệ"),
  role: z.nativeEnum(CrewRole),
  day_rate: z.coerce
    .number({ invalid_type_error: "Ngày công phải là số" })
    .int("Ngày công phải là số nguyên")
    .min(0, "Ngày công không hợp lệ"),
  status: z.nativeEnum(CrewStatus),
  note: z.string().optional(),
});

export type CrewFormValues = z.infer<typeof crewSchema>;

// Phân công nhân sự — replaces the crew assigned to a công trình with the given
// set. Used by the "Đội thi công" tab's assign dialog.
export const assignmentSchema = z.object({
  project_code: z.string().min(1, "Thiếu mã công trình"),
  crew_ids: z.array(z.number().int()).default([]),
});

export type AssignmentFormValues = z.infer<typeof assignmentSchema>;
