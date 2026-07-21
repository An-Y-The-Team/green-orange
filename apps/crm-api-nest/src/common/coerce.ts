// Bridge the JSON contract (number VND, 'YYYY-MM-DD' strings) to Prisma's write
// types (BigInt columns, Date columns). Reads convert back via the interceptor.
export const toDate = (s?: string | null): Date | null =>
  s ? new Date(s) : null;

export const toBig = (n?: number | null): bigint | null =>
  n === undefined || n === null ? null : BigInt(Math.trunc(n));
