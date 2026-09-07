"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "../lib/utils";

/**
 * Underlined tab bar (Base UI Tabs).
 *
 * Replaces two byte-identical hand-rolled `<button>` rows — the project
 * workspace's and the crew page's — that had no `role="tablist"`, no
 * `aria-selected`, no `aria-controls`, no arrow-key movement and no
 * `role="tabpanel"`. A screen reader heard a plain row of buttons, and the
 * active one was distinguishable only by border and text colour, i.e. by colour
 * alone.
 *
 * All of that comes free from the primitive; this only carries the styling the
 * two copies shared.
 */
function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("w-full", className)}
      {...props}
    />
  );
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("mb-4 flex flex-wrap gap-1 border-b", className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors outline-none",
        "hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        // Weight as well as colour, so the selected tab is not signalled by hue
        // alone (WCAG 1.4.1).
        "data-selected:border-primary data-selected:font-semibold data-selected:text-foreground",
        className
      )}
      {...props}
    />
  );
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn("outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsPanel, TabsTrigger };
