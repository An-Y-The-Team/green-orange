import { z } from "zod";

// Input is `unknown`, not `T`: field-level `.catch()` (the house pattern for
// self-healing URL params) widens a schema's input type to unknown, which the
// default `ZodType<T>` (input = T) rejects at the call site.
export const validateWithSchema = <T>(
  params: unknown,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  fallback: T
): T => {
  const result = schema.safeParse(params);
  return result.success ? result.data : fallback;
};
