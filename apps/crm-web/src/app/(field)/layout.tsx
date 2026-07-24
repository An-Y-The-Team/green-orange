import { auth } from "@/auth";
import { authEnabled } from "@/auth.config";
import { LoginOverlay } from "@/components/login-overlay";
import { formatDate } from "@/lib/format";

import { FieldBottomBar } from "./components/field-bottom-bar";

// Mirror (dashboard)/layout.tsx: CRM_API_URL is runtime-only and the data layer
// reads it at module load, so force-dynamic per request (else prod serves the
// build-time mock branch). Applies to every route in this group.
export const dynamic = "force-dynamic";

export default async function FieldLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Same auth gate as the dashboard — no middleware, gating lives here so the
  // deep-linked URL is preserved and the inline overlay signs in in place.
  const session = authEnabled ? await auth() : null;
  const needsLogin =
    authEnabled && (!session?.user || session.error === "RefreshTokenError");

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="text-sm font-semibold">GreenOrange</span>
        <span className="text-sm text-muted-foreground">
          {formatDate(new Date().toISOString())}
        </span>
      </header>
      <main className="flex-1 p-4 pb-24">
        {needsLogin ? <LoginOverlay /> : children}
      </main>
      <FieldBottomBar />
    </div>
  );
}
