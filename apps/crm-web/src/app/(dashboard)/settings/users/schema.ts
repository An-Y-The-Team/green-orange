import { z } from "zod";

// One schema for create and edit — Authentik requires username + name either
// way. The username IS the login (`sub` in every token), so it is kept to the
// safe subset up front rather than discovering the constraint at sign-in.
export const userSchema = z.object({
  username: z
    .string()
    .regex(
      /^[a-z0-9._-]{2,}$/,
      "Chỉ dùng chữ thường không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới."
    ),
  name: z.string().min(1, "Nhập họ tên"),
  // Empty allowed; Authentik validates the format only when present.
  email: z
    .union([z.string().email("Email không hợp lệ"), z.literal("")])
    .optional(),
});
export type UserFormValues = z.infer<typeof userSchema>;
