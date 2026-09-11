"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon, ListFilterIcon } from "lucide-react";

import { cn } from "../lib/utils";
import { selectClass } from "./select";

export type MultiSelectOption = { value: string; label: string };

/**
 * Multi-value filter dropdown (Base UI Select with `multiple`). Closed state
 * always leads with a filter icon and the field name — "Trạng thái: Tất cả",
 * "Trạng thái: Đã thu", "Trạng thái: 3 đã chọn" — because a bare "3 đã chọn"
 * read as a mystery counter, not a filter. No in-list search — every current
 * option list fits a screen; port the searchable variant the day one doesn't.
 */
function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  className?: string;
  /** For a filter the server would ignore — e.g. the money screen's status
   *  filter while "chỉ quá hạn" is on, since `overdue` replaces `status`. */
  disabled?: boolean;
}) {
  // Nothing or everything selected both mean "no constraint".
  const all = value.length === 0 || value.length === options.length;
  const labels = value.map(
    (v) => options.find((o) => o.value === v)?.label ?? v
  );
  const detail = all
    ? "Tất cả"
    : labels.length <= 2
      ? labels.join(", ")
      : `${labels.length} đã chọn`;

  return (
    <SelectPrimitive.Root
      multiple
      value={value}
      onValueChange={(next: string[]) => onChange(next)}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        data-slot="multi-select-trigger"
        aria-label={placeholder}
        className={cn(
          // The same string a native <select> gets — shared, not copied, so a
          // filter toolbar mixing the two lines up by construction.
          selectClass,
          "flex items-center justify-between gap-1.5 select-none",
          all && "text-muted-foreground",
          disabled && "opacity-50",
          className
        )}
      >
        <ListFilterIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">
          {placeholder}: {detail}
        </span>
        <SelectPrimitive.Icon>
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        {/* z-index on the positioner, above the dialog layer — see the note in
            date-input.tsx: on the popup it leaves the positioner at `z-auto`,
            and a MultiSelect opened inside a dialog would render behind it. */}
        <SelectPrimitive.Positioner
          sideOffset={4}
          align="start"
          className="z-60"
        >
          <SelectPrimitive.Popup
            data-slot="multi-select-popup"
            className={cn(
              "min-w-(--anchor-width) rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none",
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
