"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

import { cn } from "@yan/ui/lib/utils";

import { NAV_ITEMS, type NavItem, USERS_HREF, activeNav } from "@/config/nav";
import { APP_NAME } from "@/constants/labels";

/**
 * The nav links themselves, shared by the fixed desktop sidebar and the mobile
 * drawer — one list, so the two chromes cannot drift apart.
 *
 * `showUsers` comes from the layout: Người dùng only exists where the Authentik
 * admin API is configured. It is a plain env boolean, NOT `isUserAdmin()`, which
 * would put an Authentik round-trip on every dashboard render.
 */
export function NavList({
  onNavigate,
  showUsers,
}: {
  onNavigate?: () => void;
  showUsers?: boolean;
}) {
  const pathname = usePathname();
  const tab = useSearchParams().get("tab");
  const active = activeNav(pathname, tab);

  // A section opens itself when you are inside it; a chevron press overrides
  // that for the rest of the session. Derived, so there is no effect to sync —
  // and nothing to persist, since arriving on a page already opens its section.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (item: NavItem) =>
    toggled[item.href] ?? item.href === active?.section.href;

  return (
    // ponytail: native vertical scroll rather than a ScrollArea (see the
    // Scrollbars rule in .claude/frontend-code-style.md). It only appears with
    // every section expanded at once, and labels already truncate, so the
    // scrollbar's 15px steals nothing that reflows. Upgrade path if it ever
    // bites: @base-ui/react/scroll-area.
    <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
      {NAV_ITEMS.map((item) =>
        item.children ? (
          <Collapsible.Root
            key={item.href}
            open={isOpen(item)}
            onOpenChange={(open) =>
              setToggled((prev) => ({ ...prev, [item.href]: open }))
            }
          >
            <div className="flex items-center gap-0.5">
              <NavLink
                item={item}
                active={active?.leaf.href === item.href}
                onNavigate={onNavigate}
                className="min-w-0 flex-1"
              />
              {/* aria-expanded carries the state, so the label never flips. */}
              <Collapsible.Trigger
                aria-label={item.label}
                className="group rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              >
                {/* data-panel-open lands on the trigger, not the icon. */}
                <ChevronRight className="size-3.5 transition-transform group-data-[panel-open]:rotate-90" />
              </Collapsible.Trigger>
            </div>
            {/* Closed panels unmount, so hidden children are not tab stops. */}
            <Collapsible.Panel className="flex flex-col gap-0.5 py-0.5">
              {item.children
                .filter((child) => child.href !== USERS_HREF || showUsers)
                .map((child) => (
                  <NavLink
                    key={child.href}
                    item={child}
                    active={active?.leaf.href === child.href}
                    onNavigate={onNavigate}
                    // pl-9 lands the label under the parent's, past its icon.
                    className="pl-9"
                  />
                ))}
            </Collapsible.Panel>
          </Collapsible.Root>
        ) : (
          <NavLink
            key={item.href}
            item={item}
            active={active?.leaf.href === item.href}
            onNavigate={onNavigate}
          />
        )
      )}
    </nav>
  );
}

function NavLink({
  item,
  active,
  onNavigate,
  className,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      // Expresses the highlight to a screen reader, not just to the eye.
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        className
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0" /> : null}
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/** Brand block — same in both chromes. */
export function NavBrand() {
  return (
    // px-3, not px-4: at the narrower w-48 sidebar the brand needs 140px and
    // px-4 left it 138.5 — it truncated to "GreenOrange C…" by 1.5px.
    <div className="flex h-14 shrink-0 items-center gap-2 px-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
        G
      </div>
      <span className="truncate text-sm font-semibold">{APP_NAME}</span>
    </div>
  );
}
