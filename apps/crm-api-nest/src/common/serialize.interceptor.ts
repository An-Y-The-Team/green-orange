import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Observable, map } from "rxjs";

/**
 * The one column-name rule that decides date-only vs full ISO. Adding a new
 * `@db.Date` column needs no code change as long as it is named `*_date`; a
 * second date-only convention would be added here and nowhere else.
 */
export const DATE_ONLY_SUFFIX = "_date";

// Contract-wide serialization rules, applied once for every response:
//   • BigInt (integer VND) → JSON number. Safe: VND values are well under 2^53.
//   • Prisma Decimal (quantity, hours) → JSON number.
//   • Date columns follow the schema naming convention:
//       *_date (@db.Date)  → 'YYYY-MM-DD'
//       *_at   (timestamp) → full ISO string (appointment_at keeps its time)
// Walks arrays and nested objects recursively.
//
// `unknown` in / `unknown` out on purpose: this is the whole HTTP contract's
// choke point, so it must not be able to silently accept a Prisma type it does
// not handle. `columnName` is the JSON key the value was found under — the only
// thing that distinguishes a date-only column from a timestamp.
export function normalize(value: unknown, columnName?: string): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Prisma.Decimal) return Number(value);
  if (value instanceof Date)
    return columnName?.endsWith(DATE_ONLY_SUFFIX)
      ? value.toISOString().slice(0, 10)
      : value.toISOString();
  if (Array.isArray(value))
    return (value as unknown[]).map((v) => normalize(v, columnName));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalize(v, k);
    return out;
  }
  return value;
}

@Injectable()
export class SerializeInterceptor implements NestInterceptor<unknown, unknown> {
  intercept(
    _ctx: ExecutionContext,
    next: CallHandler<unknown>
  ): Observable<unknown> {
    return next.handle().pipe(map((value) => normalize(value)));
  }
}
