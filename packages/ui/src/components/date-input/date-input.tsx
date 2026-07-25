"use client";

// ponytail: native <input type="date"> renders its picker + value in the *browser's*
// locale — no page attribute (not even <html lang="vi">) can override it. Hence this
// minimal vi calendar instead. Upgrade to react-day-picker if ranges/multi-month land.
import { Popover } from "@base-ui/react/popover";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Button } from "../button";
import { Input } from "../input";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const monthLabel = new Intl.DateTimeFormat("vi-VN", {
  month: "long",
  year: "numeric",
});

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "2026-07-25" -> "25/07/2026" */
function toDisplay(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** "25/7/2026" -> "2026-07-25", or null if not a real date */
function fromDisplay(text: string) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getMonth() === mo - 1 && date.getDate() === d
    ? toISO(date)
    : null;
}

function DateInput({
  value,
  onChange,
  className,
  disabled,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: string;
  /** receives "YYYY-MM-DD", or "" when cleared */
  onChange: (iso: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  // non-null only while the user is typing, so `value` stays the source of truth
  const [draft, setDraft] = React.useState<string | null>(null);
  const [viewMonth, setViewMonth] = React.useState<string | null>(null);

  const today = toISO(new Date());
  const view = viewMonth ?? (value || today).slice(0, 7);
  const [vy, vm] = view.split("-").map(Number) as [number, number];
  const firstOfMonth = new Date(vy, vm - 1, 1);
  const lead = (firstOfMonth.getDay() + 6) % 7; // Monday-first
  const days = new Date(vy, vm, 0).getDate();

  const shiftMonth = (by: number) =>
    setViewMonth(toISO(new Date(vy, vm - 1 + by, 1)).slice(0, 7));

  const pick = (iso: string) => {
    onChange(iso);
    setDraft(null);
    setOpen(false);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Input
        {...props}
        disabled={disabled}
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        className="pr-8"
        value={draft ?? toDisplay(value)}
        onChange={(e) => {
          const text = e.target.value;
          setDraft(text);
          if (text.trim() === "") onChange("");
          else {
            const iso = fromDisplay(text);
            if (iso) onChange(iso);
          }
        }}
        onBlur={() => setDraft(null)}
      />
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setViewMonth(null);
        }}
      >
        <Popover.Trigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              type="button"
              disabled={disabled}
              aria-label="Mở lịch"
              className="absolute top-1 right-1"
            >
              <CalendarIcon />
            </Button>
          }
        />
        <Popover.Portal>
          <Popover.Positioner sideOffset={4} align="end">
            <Popover.Popup className="z-50 w-64 rounded-xl bg-popover p-3 text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none">
              <div className="mb-2 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  type="button"
                  aria-label="Tháng trước"
                  onClick={() => shiftMonth(-1)}
                >
                  <ChevronLeftIcon />
                </Button>
                <span className="text-sm font-medium capitalize">
                  {monthLabel.format(firstOfMonth)}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  type="button"
                  aria-label="Tháng sau"
                  onClick={() => shiftMonth(1)}
                >
                  <ChevronRightIcon />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-muted-foreground">
                {WEEKDAYS.map((d) => (
                  <span key={d} className="py-1">
                    {d}
                  </span>
                ))}
                {Array.from({ length: lead }, (_, i) => (
                  <span key={`lead-${i}`} />
                ))}
                {Array.from({ length: days }, (_, i) => {
                  const iso = toISO(new Date(vy, vm - 1, i + 1));
                  return (
                    <Button
                      key={iso}
                      type="button"
                      variant={iso === value ? "default" : "ghost"}
                      size="icon-xs"
                      className={cn(
                        "mx-auto text-sm",
                        iso !== value &&
                          iso === today &&
                          "font-bold text-primary"
                      )}
                      aria-current={iso === today ? "date" : undefined}
                      onClick={() => pick(iso)}
                    >
                      {i + 1}
                    </Button>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between">
                <Button
                  variant="link"
                  size="xs"
                  type="button"
                  className="px-0"
                  onClick={() => pick(today)}
                >
                  Hôm nay
                </Button>
                <Button
                  variant="link"
                  size="xs"
                  type="button"
                  className="px-0 text-muted-foreground"
                  onClick={() => {
                    onChange("");
                    setDraft(null);
                    setOpen(false);
                  }}
                >
                  Xoá
                </Button>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

export { DateInput, fromDisplay as parseVnDate, toDisplay as formatVnDate };
