import { type NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  console.log(`[REQ] ${req.method} ${req.nextUrl.pathname}`);
  return NextResponse.next();
}

export const config = {
  // Run on app routes, but exclude static assets and Next.js internals
  // to prevent flooding the logs with noise.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
