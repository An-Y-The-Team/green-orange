"use client";

import { Drawer } from "@base-ui/react/drawer";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@yan/ui/components/button";
import { ThemeSwitcher } from "@yan/ui/components/theme-switcher";

import { SidebarFooter } from "@/components/app-sidebar/app-sidebar";
import { NavBrand, NavList } from "@/components/app-sidebar/nav-list";
import { activeNavItem } from "@/config/nav";

/**
 * The dashboard header: nav trigger (below `md`) + the current page's name +
 * theme switch.
 *
 * It used to spend its whole 56px on the static string "Quản lý quan hệ khách
 * hàng" — no title, no breadcrumb, nothing. The title comes from the same
 * longest-prefix match that highlights the sidebar (`activeNavItem`), so the two
 * cannot disagree; a deep route like `/projects/12/quotes/new` still reads
 * "Công trình", which is the orientation a topbar owes the reader.
 *
 * Base UI's `Drawer` (already a dependency) brings the focus trap, Esc, scroll
 * lock and swipe-to-dismiss; `swipeDirection="left"` matches a panel anchored to
 * the left edge.
 */
export function AppTopbar({ footer }: { footer?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const title = activeNavItem(pathname)?.label;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 md:px-6 print:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <Drawer.Root open={open} onOpenChange={setOpen} swipeDirection="left">
          <Drawer.Trigger
            render={
              <Button variant="ghost" size="icon-sm" className="md:hidden">
                <Menu />
                <span className="sr-only">Mở menu điều hướng</span>
              </Button>
            }
          />
          <Drawer.Portal>
            <Drawer.Backdrop className="fixed inset-0 z-50 bg-black/20 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
            <Drawer.Viewport>
              <Drawer.Popup className="fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground outline-none">
                <Drawer.Title className="sr-only">Điều hướng</Drawer.Title>
                <NavBrand />
                {/* Closing on navigate: the drawer would otherwise stay over the
                    page the user just asked for. */}
                <NavList onNavigate={() => setOpen(false)} />
                <SidebarFooter footer={footer} />
              </Drawer.Popup>
            </Drawer.Viewport>
          </Drawer.Portal>
        </Drawer.Root>

        <span className="truncate text-sm font-medium">{title}</span>
      </div>
      <ThemeSwitcher />
    </header>
  );
}
