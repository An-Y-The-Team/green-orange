"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

import { cn } from "../lib/utils";

export type MultiSelectOption = { value: string; label: string };

/**
 * Multi-value filter dropdown (Base UI Select with `multiple`). Closed state
 * shows the placeholder, one selected label, or "N đã chọn". No in-list
 * search — every current option list fits a screen; port the searchable
 * variant the day one doesn't.
 */
function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  className,
}: {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  className?: string;
}) {
  const summary =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? (options.find((o) => o.value === value[0])?.label ?? value[0])
        : `${value.length} đã chọn`;

  return (
    <SelectPrimitive.Root
      multiple
      value={value}
      onValueChange={(next: string[]) => onChange(next)}
    >
      <SelectPrimitive.Trigger
        data-slot="multi-select-trigger"
        aria-label={placeholder}
        className={cn(
          // Mirrors the Input component / crm-web's SELECT_CLASS so filter
          // controls line up with the rest of the toolbar.
          "flex h-8 items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          value.length === 0 && "text-muted-foreground",
          className
        )}
      >
        <span className="truncate">{summary}</span>
        <SelectPrimitive.Icon>
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner sideOffset={4} align="start">
          <SelectPrimitive.Popup
            data-slot="multi-select-popup"
            className={cn(
              "z-50 min-w-(--anchor-width) rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none",
              "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
            )}
          >
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-md px-2 py-1.5 outline-none select-none data-highlighted:bg-muted"
              >
                <SelectPrimitive.ItemIndicator className="col-start-1">
                  <CheckIcon className="size-4" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText className="col-start-2">
                  {option.label}
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export { MultiSelect };
