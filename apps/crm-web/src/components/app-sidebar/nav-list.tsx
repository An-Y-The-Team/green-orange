"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@yan/ui/lib/utils";

import { NAV_ITEMS, activeNavItem } from "@/config/nav";

/**
 * The nav links themselves, shared by the fixed desktop sidebar and the mobile
 * drawer — one list, so the two chromes cannot drift apart.
 */
export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const activeHref = activeNavItem(pathname)?.href;

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-2 py-2">
      {NAV_ITEMS.map((item) => {
        const active = activeHref === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            // Expresses the highlight to a screen reader, not just to the eye.
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Brand block — same in both chromes. */
export function NavBrand() {
  return (
    // px-3, not px-4: at the narrower w-48 sidebar the brand needs 140px and
    // px-4 left it 138.5 — it truncated to "GreenOrange C…" by 1.5px.
    <div className="flex h-14 items-center gap-2 px-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
        G
      </div>
      <span className="truncate text-sm font-semibold">GreenOrange CRM</span>
    </div>
  );
}
