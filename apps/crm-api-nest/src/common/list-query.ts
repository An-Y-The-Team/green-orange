import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

// Shared query DTO for user-filterable list endpoints (backend-code-style.md
// §Pagination: anything the client controls — filters, sort, search — must be
// a typed, constrained parameter).
//
// This is a real class, so the global ValidationPipe({ whitelist: true })
// strips every undeclared query key. `limit`/`offset` MUST stay declared here:
// dropping them would silently break every existing pager that sends them.
// The shape stays string-typed so instances satisfy `PageQuery` for
// `pageArgs()` untouched.
export class ListQueryDto {
  @IsOptional() @IsString() limit?: string;
  @IsOptional() @IsString() offset?: string;
  // Bounded so a hostile query can't ship a megabyte into an ILIKE.
  @IsOptional() @IsString() @MaxLength(300) search?: string;
  @IsOptional() @IsIn(["asc", "desc"]) sort_order?: "asc" | "desc";
  // `sort_by` lives on each endpoint's subclass — the whitelist of sortable
  // columns is per-entity, and an un-whitelisted value must 400, not pass.
}

// `?status=` (empty) and a missing param both mean "no filter" — mirrors the
// old `status || undefined` single-value behavior. `String()` also flattens a
// repeated key (`?status=a&status=b` arrives as an array; String → "a,b").
const splitCsv = (value: unknown): string[] | undefined => {
  if (typeof value !== "string" && !Array.isArray(value)) return undefined;
  const parts = String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
};

/** Csv query param → string[]; pair with `@IsIn(VALUES, { each: true })`. */
export const CsvIn = () => Transform(({ value }) => splitCsv(value));

/** Csv query param → number[]; pair with `@IsInt({ each: true })`. */
export const CsvIntIn = () =>
  Transform(({ value }) => splitCsv(value)?.map(Number));

/**
 * Case-insensitive substring match for Prisma `where` clauses. Prisma does
 * not escape LIKE wildcards in `contains`, so without the replace a search
 * of "%" matches every row and "_" any single character.
 */
export const insensitive = (search: string) => ({
  contains: search.replace(/[\\%_]/g, "\\$&"),
  mode: "insensitive" as const,
});

/**
 * Whitelisted, client-controlled sort. `map` is the per-endpoint whitelist
 * (entries are functions so relation sorts like `(o) => ({ client: { name: o
 * } })` fit); `sort_by` outside it is rejected upstream by the DTO's `@IsIn`.
 * A chosen sort always gets the `id` tiebreak — every sortable column here is
 * non-unique, and without a total order pages overlap. No `sort_by` keeps the
 * endpoint's historical default order.
 */
export const orderByArgs = <
  M extends Record<string, (dir: "asc" | "desc") => object>,
  F extends object,
>({
  map,
  sortBy,
  sortOrder,
  fallback,
}: {
  map: M;
  sortBy?: keyof M & string;
  sortOrder?: "asc" | "desc";
  fallback: F[];
}): (ReturnType<M[keyof M]> | { id: "asc" | "desc" } | F)[] =>
  sortBy
    ? [
        map[sortBy](sortOrder ?? "asc") as ReturnType<M[keyof M]>,
        { id: "desc" },
      ]
    : fallback;
