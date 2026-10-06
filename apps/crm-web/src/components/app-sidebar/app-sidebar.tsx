"use client";

import { Monitor, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@yan/ui/lib/utils";

import { SIDEBAR_COLLAPSED, SIDEBAR_COOKIE } from "./constants";
import { NavBrand, NavList } from "./nav-list";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Fixed desktop sidebar. Hidden below `md`, where the same nav is reachable from
 * the topbar's drawer instead — it used to be `w-60 shrink-0` at every width,
 * which at the app's 112.5% root font-size is 270 physical px, leaving ~105px of
 * a 390px phone for `<main>` (whose padding alone is ~54px).
 *
 * `w-48` rather than the old `w-60`: 216px still fits the longest label
 * ("Thông tin công ty") and hands 54px back to the tables.
 *
 * Collapsible to a `w-14` icon rail (2026-10-06) so the three-pane project
 * page gets its width back. The rail is pure CSS off `data-collapsed` on this
 * `group/sidebar`: NavList, NavBrand and the footer hide their text with
 * `group-data-[collapsed=true]/sidebar:hidden`, so the mobile drawer — the same
 * components, never inside this group — is untouched.
 */
export function AppSidebar({
  footer,
  showUsers,
  defaultCollapsed = false,
}: {
  footer?: React.ReactNode;
  showUsers?: boolean;
  /** From the `sidebar` cookie, read by the layout on the server. */
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  // Thu gọn / Mở rộng — flips the rail and remembers it for the next page load.
  const handleToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? SIDEBAR_COLLAPSED : ""}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  };

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "group/sidebar hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 motion-reduce:transition-none md:flex",
        collapsed ? "w-14" : "w-48"
      )}
    >
      <NavBrand />
      <NavList showUsers={showUsers} />
      <SidebarFooter footer={footer}>
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={!collapsed}
          aria-label={
            collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"
          }
          title={collapsed ? "Mở rộng" : "Thu gọn"}
          className="flex w-full items-center gap-2 rounded-md px-1 py-1 transition-colors outline-none hover:bg-sidebar-accent/60 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-3.5 shrink-0" />
          ) : (
            <PanelLeftClose className="size-3.5 shrink-0" />
          )}
          <span className="group-data-[collapsed=true]/sidebar:hidden">
            Thu gọn
          </span>
        </button>
      </SidebarFooter>
    </aside>
  );
}

/**
 * Signed-in user + sign-out (server-rendered nodes passed down by the layout,
 * since the sign-out is a server action), plus the way into field mode — which
 * was previously reachable only by typing `/field`. `children` takes extra rows
 * (the desktop sidebar's collapse toggle).
 */
export function SidebarFooter({
  footer,
  children,
}: {
  footer?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="shrink-0 space-y-2 border-t border-sidebar-border p-3 text-xs text-muted-foreground">
      {children}
      <Link
        href="/field"
        title="Chế độ hiện trường"
        className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      >
        <Monitor className="size-3.5 shrink-0" />
        <span className="group-data-[collapsed=true]/sidebar:hidden">
          Chế độ hiện trường
        </span>
      </Link>
      {footer ?? (
        <p className="px-1 group-data-[collapsed=true]/sidebar:hidden">Guest</p>
      )}
    </div>
  );
}
