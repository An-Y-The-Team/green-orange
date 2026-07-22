import { type NextRequest, NextResponse } from "next/server";

// Pass-through. Auth gating lives in the dashboard layout (login-overlay) so a
// deep-linked URL survives login instead of bouncing to /login, and crm-api
// stays the hard boundary (it rejects tokenless requests). This also removes
// the build-time env freeze: the old `authEnabled` branch here was inlined at
// build (where auth env is absent by design), silently disabling the gate in
// prod. The layout runs force-dynamic, so its gate reads runtime env correctly.
export default function proxy(req: NextRequest) {
  console.log(`[REQ] ${req.method} ${req.nextUrl.pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
