import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Observable, map } from "rxjs";

// Contract-wide serialization rules, applied once for every response:
//   • BigInt (integer VND) → JSON number. Safe: VND values are well under 2^53.
//   • Prisma Decimal (quantity, hours) → JSON number.
//   • Date columns follow the schema naming convention:
//       *_date (@db.Date)  → 'YYYY-MM-DD'
//       *_at   (timestamp) → full ISO string (appointment_at keeps its time)
// Walks arrays and nested objects recursively.
export function normalize(value: any, key?: string): any {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Prisma.Decimal) return Number(value);
  if (value instanceof Date)
    return key?.endsWith("_date")
      ? value.toISOString().slice(0, 10)
      : value.toISOString();
  if (Array.isArray(value)) return value.map((v) => normalize(v, key));
  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const k of Object.keys(value)) out[k] = normalize(value[k], k);
    return out;
  }
  return value;
}

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((value) => normalize(value)));
  }
}
