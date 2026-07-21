import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, map } from "rxjs";

// The two contract-wide serialization rules, applied once for every response
// instead of in each service:
//   • BigInt (integer VND) → JSON number. Safe: VND values are well under 2^53.
//   • Date (@db.Date) → 'YYYY-MM-DD'. The UI types are date-only strings.
// Walks arrays and nested objects (incl. Quote.items JSON) recursively.
export function normalize(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const key of Object.keys(value)) out[key] = normalize(value[key]);
    return out;
  }
  return value;
}

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(normalize));
  }
}
