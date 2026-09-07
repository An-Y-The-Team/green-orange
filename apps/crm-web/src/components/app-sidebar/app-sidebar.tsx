import { Monitor } from "lucide-react";
import Link from "next/link";

import { NavBrand, NavList } from "./nav-list";

/**
 * Fixed desktop sidebar. Hidden below `md`, where the same nav is reachable from
 * the topbar's drawer instead — it used to be `w-60 shrink-0` at every width,
 * which at the app's 112.5% root font-size is 270 physical px, leaving ~105px of
 * a 390px phone for `<main>` (whose padding alone is ~54px).
 *
 * `w-48` rather than the old `w-60`: 216px still fits the longest label
 * ("Thông tin công ty") and hands 54px back to the tables, which were losing
 * columns off the right edge at 1440px, not just on phones.
 */
export function AppSidebar({ footer }: { footer?: React.ReactNode }) {
  return (
    <aside className="hidden h-full w-48 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <NavBrand />
      <NavList />
      <SidebarFooter footer={footer} />
    </aside>
  );
}

/**
 * Signed-in user + sign-out (server-rendered nodes passed down by the layout,
 * since the sign-out is a server action), plus the way into field mode — which
 * was previously reachable only by typing `/field`.
 */
export function SidebarFooter({ footer }: { footer?: React.ReactNode }) {
  return (
    <div className="space-y-2 border-t border-sidebar-border p-3 text-xs text-muted-foreground">
      <Link
        href="/field"
        className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      >
        <Monitor className="size-3.5 shrink-0" />
        Chế độ hiện trường
      </Link>
      {footer ?? <p className="px-1">Guest</p>}
    </div>
  );
}
