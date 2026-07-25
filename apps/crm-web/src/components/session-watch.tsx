"use client";

import { SessionProvider, useSession } from "next-auth/react";

import { LoginOverlay } from "./login-overlay";

// The server layouts gate on every request, so expiry surfaces the moment you
// navigate — but a tab left open all afternoon never re-renders and keeps showing
// a page it can no longer act on. This polls /api/auth/session (and refetches on
// window focus, the provider default) so the login overlay appears on its own.
// The poll runs the jwt callback server-side, so it doubles as the keep-alive
// that refreshes a still-live Authentik token.
function Watch() {
  const { data, status } = useSession();
  if (status === "loading") return null;
  if (status === "authenticated" && !data.error) return null;
  return <LoginOverlay expired />;
}

// ponytail: fixed 2-minute poll — one cheap same-origin request per open tab.
// Make it configurable only if Authentik's access-token lifetime drops below it.
export function SessionWatch() {
  return (
    <SessionProvider refetchInterval={120}>
      <Watch />
    </SessionProvider>
  );
}
