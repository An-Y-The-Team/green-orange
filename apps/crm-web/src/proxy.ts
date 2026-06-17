import NextAuth from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

import authConfig, { authEnabled } from "@/auth.config";

// When Authentik is configured, the Auth.js middleware enforces the `authorized`
// callback (redirecting anonymous users to /login). When it isn't (local/mock
// dev), middleware is a pass-through so the dashboard stays open and no
// AUTH_SECRET is required.
const { auth } = NextAuth(authConfig);

export default authEnabled
  ? auth((req) => {
      console.log(`[REQ] ${req.method} ${req.nextUrl.pathname}`);
    })
  : (req: NextRequest) => {
      console.log(`[REQ] ${req.method} ${req.nextUrl.pathname}`);
      return NextResponse.next();
    };

export const config = {
  // Run on app routes, but never on Auth.js endpoints, the login page, Next
  // internals, or static assets (avoids redirect loops).
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
