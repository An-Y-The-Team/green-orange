import { AppSidebar } from "@/components/app-sidebar";
import { isLiveMode } from "@/lib/api";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-6">
          <span className="text-sm text-muted-foreground">
            Quản lý quan hệ khách hàng
          </span>
          <span
            className={
              "rounded-full px-2.5 py-1 text-xs font-medium " +
              (isLiveMode
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400")
            }
          >
            {isLiveMode ? "● Dữ liệu trực tiếp (API)" : "● Dữ liệu mẫu (mock)"}
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
