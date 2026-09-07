"use client";

import { Home, Monitor, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@yan/ui/lib/utils";

// `/projects/new` lives in the (dashboard) group, so tapping Tiếp nhận swaps the
// whole chrome and this bar disappears. `shell=field` is what the intake page
// reads to offer a way back — NOT `from`, which that page already uses for the
// repeat-business project id (`Number("field")` would be NaN).
const FIELD_NAV_ITEMS = [
  { label: "Hôm nay", href: "/field", icon: Home },
  { label: "Tiếp nhận", href: "/projects/new?shell=field", icon: Plus },
  { label: "Máy tính", href: "/dashboard", icon: Monitor },
];

export function FieldBottomBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md border-t border-border bg-background">
      {FIELD_NAV_ITEMS.map((item) => {
        const path = item.href.split("?")[0]!;
        const active = pathname === path || pathname.startsWith(`${path}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors",
              active
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-6" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
