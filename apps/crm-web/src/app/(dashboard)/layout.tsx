import { LogOut } from "lucide-react";

import { Button } from "@yan/ui/components/button";
import { ThemeSwitcher } from "@yan/ui/components/theme-switcher";

import { auth, signOut } from "@/auth";
import { AUTH_ENABLED } from "@/auth.config";
import { AppSidebar } from "@/components/app-sidebar/app-sidebar";
import { LoginOverlay } from "@/components/login-overlay/login-overlay";
import { SessionWatch } from "@/components/session-watch/session-watch";

// CRM_API_URL is runtime-only, but the data layer reads it at module load.
// Without this, Next prerenders every dashboard page at BUILD time — where
// CRM_API_URL is absent — and serves that frozen HTML in prod, never hitting the
// live backend (a real past production bug). Forcing dynamic here applies to all
// routes in this group, so they fetch live data (and resolve the session) per
// request. Inherited by child pages; the [id] routes are already dynamic.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Only resolve a session when Authentik is enabled (with auth off, no
  // AUTH_SECRET is needed). Gating lives HERE, not in the middleware, so the
  // deep-linked URL is preserved: render the chrome, withhold children (their
  // crm-api fetches have no token → 401 noise), and let the inline overlay sign
  // in and refresh the same page. A dead refresh token re-gates too, so pages
  // never fetch with a token that can no longer be refreshed.
  const session = AUTH_ENABLED ? await auth() : null;
  const needsLogin =
    AUTH_ENABLED && (!session?.user || session.error === "RefreshTokenError");
  const userLabel = session?.user?.email ?? session?.user?.name;

  return (
    <div className="flex h-dvh overflow-hidden print:block print:h-auto print:overflow-visible">
      <div className="print:hidden">
        <AppSidebar
          footer={
            userLabel ? (
              <div className="flex items-center justify-between gap-2">
                <span className="truncate" title={userLabel}>
                  {userLabel}
                </span>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <Button type="submit" variant="ghost" size="icon-sm">
                    <LogOut />
                    <span className="sr-only">Đăng xuất</span>
                  </Button>
                </form>
              </div>
            ) : undefined
          }
        />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-6 print:hidden">
          <span className="text-sm text-muted-foreground">
            Quản lý quan hệ khách hàng
          </span>
          <ThemeSwitcher />
        </header>
        <main className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">
          {needsLogin ? (
            <LoginOverlay expired={Boolean(session?.error)} />
          ) : (
            <>
              {AUTH_ENABLED && <SessionWatch />}
              {children}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
