"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import * as React from "react";

import { cn } from "../lib/utils";

/**
 * A styled dropdown menu over Base UI's `Menu` (the header's "Khác" overflow).
 *
 * Keyboard (arrows, type-ahead, Escape) and focus return come from Base UI.
 * Items are 44px tall, the touch-target floor, and the highlight ring is the
 * focus indicator, so it is never removed without a replacement.
 */
function Menu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root {...props} />;
}

function MenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="menu-trigger" {...props} />;
}

function MenuContent({
  className,
  align = "end",
  sideOffset = 4,
  children,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "align" | "sideOffset">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        align={align}
        sideOffset={sideOffset}
        className="z-50"
      >
        <MenuPrimitive.Popup
          data-slot="menu-content"
          className={cn(
            "min-w-44 rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow outline-none",
            className
          )}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function MenuItem({
  className,
  tone = "default",
  ...props
}: MenuPrimitive.Item.Props & { tone?: "default" | "destructive" }) {
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      className={cn(
        "flex min-h-11 cursor-default items-center gap-2 rounded-md px-3 outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50",
        tone === "destructive"
          ? "text-destructive data-highlighted:bg-destructive/10"
          : "data-highlighted:bg-muted",
        "data-highlighted:ring-2 data-highlighted:ring-ring/50",
        className
      )}
      {...props}
    />
  );
}

function MenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="menu-separator"
      className={cn("my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger };
