import { LogOut } from "lucide-react";

import { Button } from "@yan/ui/components/button";

import { auth, signOut } from "@/auth";
import { authEnabled } from "@/auth.config";
import { AppSidebar } from "@/components/app-sidebar";
import { isLiveMode } from "@/lib/http";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Only resolve a session when Authentik is enabled (avoids needing AUTH_SECRET
  // in local/mock dev). The middleware already gates access when enabled.
  const session = authEnabled ? await auth() : null;
  const userLabel = session?.user?.email ?? session?.user?.name;

  return (
    <div className="flex h-dvh overflow-hidden print:block print:h-auto print:overflow-visible">
      <div className="print:hidden">
        <AppSidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-6 print:hidden">
          <span className="text-sm text-muted-foreground">
            Quản lý quan hệ khách hàng
          </span>
          <div className="flex items-center gap-3">
            <span
              className={
                "rounded-full px-2.5 py-1 text-xs font-medium " +
                (isLiveMode
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400")
              }
            >
              {isLiveMode
                ? "● Dữ liệu trực tiếp (API)"
                : "● Dữ liệu mẫu (mock)"}
            </span>
            {userLabel && (
              <>
                <span className="text-xs text-muted-foreground">
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
              </>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
