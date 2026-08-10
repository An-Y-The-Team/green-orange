"use client";

import { SearchIcon, XIcon } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/utils";
import { Button } from "./button";
import { Input } from "./input";

/**
 * Debounced search box for filterable lists. Local state echoes keystrokes
 * instantly; `onChange` fires 300ms after the last one (immediately on clear,
 * so an X-click doesn't feel laggy).
 */
function SearchInput({
  defaultValue,
  onChange,
  placeholder = "Tìm kiếm",
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "defaultValue" | "onChange"> & {
  defaultValue: string;
  onChange: (value: string) => void;
}) {
  const [localValue, setLocalValue] = React.useState(defaultValue);
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  // External reset/set (e.g. a "clear filters" button) re-syncs the field —
  // keyed on emptiness, not the exact string, so a stale URL echo of "vi"
  // can't clobber a "vil" the user has typed since. Render-time state
  // adjustment instead of a useEffect (AGENTS.md).
  const hasDefault = Boolean(defaultValue);
  const [prevHasDefault, setPrevHasDefault] = React.useState(hasDefault);
  if (hasDefault !== prevHasDefault) {
    setPrevHasDefault(hasDefault);
    setLocalValue(defaultValue);
  }

  // ponytail: unmount-only cleanup so a pending debounce can't fire into a
  // page the user already left — the one thing a ref alone can't express.
  React.useEffect(() => () => clearTimeout(timer.current), []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/^\s+/, "");
    setLocalValue(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(value), 300);
  };

  const handleClear = () => {
    clearTimeout(timer.current);
    setLocalValue("");
    onChange("");
  };

  return (
    <div data-slot="search-input" className={cn("relative", className)}>
      <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        className="pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {localValue && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleClear}
          className="absolute top-1/2 right-0.5 -translate-y-1/2"
        >
          <XIcon />
          <span className="sr-only">Xóa tìm kiếm</span>
        </Button>
      )}
    </div>
  );
}

export { SearchInput };
