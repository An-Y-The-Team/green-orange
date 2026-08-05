/**
 * Browser→Nest proxy for the client-side list queries (useFilterList). The
 * backend URL and bearer stay server-side (CRM_API_URL has no NEXT_PUBLIC_
 * prefix), so the browser talks to this route and this route reuses the same
 * transport the Server Components use — including the local-token re-mint.
 *
 * GET only, and only the exact list collections the filterable pages read.
 * A single extra segment (`/api/crm/projects/1`) or an unknown resource 404s:
 * detail reads stay server-rendered, and `/auth/token` stays unreachable.
 * The query string is forwarded verbatim — the Nest DTO whitelist strips junk
 * keys and 400s bad sort/filter values.
 */
import { type NextRequest, NextResponse } from "next/server";

import { ApiError, SESSION_EXPIRED, apiFetchList } from "@/utils/http/http";

const ALLOWED = new Set(["projects", "clients", "crew", "quotes"]);

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const [resource, ...rest] = (await ctx.params).path;
  if (!resource || rest.length || !ALLOWED.has(resource)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const { rows, total } = await apiFetchList<unknown>(
      `/${resource}${req.nextUrl.search}`
    );
    return NextResponse.json({ rows, total });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // fetchWithAuth throws a plain Error for a dead Authentik session — answer
    // 401 so the client can tell "log in again" from an outage.
    if (err instanceof Error && err.message === SESSION_EXPIRED) {
      return NextResponse.json({ error: SESSION_EXPIRED }, { status: 401 });
    }
    throw err;
  }
}
