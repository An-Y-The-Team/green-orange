import { z } from "zod";

export const validateWithSchema = <T>(
  params: unknown,
  schema: z.ZodType<T>,
  fallback: T
): T => {
  const result = schema.safeParse(params);
  return result.success ? result.data : fallback;
};
