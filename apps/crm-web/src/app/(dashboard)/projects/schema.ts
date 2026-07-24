import { z } from "zod";

export const createProjectSchema = z.object({
  client_id: z.number().int().positive(),
  location_id: z.number().int().positive(),
  working_contact_id: z.number().int().positive().optional(),
  decision_maker_contact_id: z.number().int().positive().optional(),
  name: z.string().min(1),
  type_ids: z.array(z.number().int().positive()).min(1),
  request_note: z.string().optional(),
  referral_source: z.string().optional(),
  appointment_at: z.string().optional(),
});

export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;
