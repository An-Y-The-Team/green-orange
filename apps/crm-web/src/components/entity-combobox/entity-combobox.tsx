"use client";

import { Combobox } from "@base-ui/react/combobox";
import { ChevronsUpDown, Loader2, X } from "lucide-react";
import { useState } from "react";

import { Input } from "@yan/ui/components/input";
import { cn } from "@yan/ui/lib/utils";

import { useDebouncedValue } from "@/hooks/use-debounced-value/use-debounced-value";
import { useFilterList } from "@/hooks/use-filter-list/use-filter-list";

/** What the list offers. `{ value, label }` is the shape Base UI understands. */
export interface EntityOption {
  value: number;
  label: string;
}

/** Rows the pickers need out of a list endpoint, whatever the resource. */
interface Row {
  id: number;
  name?: string;
  code?: string;
}

const LIMIT = 20;

/** Sort keys the backend whitelists per resource (`@IsIn` on its list DTO). */
const SORT: Record<string, { sortBy: string; sortOrder: "asc" | "desc" }> = {
  clients: { sortBy: "name", sortOrder: "asc" },
  projects: { sortBy: "code", sortOrder: "desc" },
};

/**
 * Searchable picker for an entity that has too many rows to list.
 *
 * The native `<select>`s it replaces were fed one server page: at 100+ clients
 * the intake form simply **could not select** the 101st, silently, on the flow
 * the design calls "under 30 seconds". This asks the server instead, through the
 * same `/api/crm/{resource}` proxy and `useFilterList` transport the filterable
 * list pages already use, so there is one search path in the app.
 *
 * Selection is held as the option OBJECT, not the id: Base UI compares items to
 * the current value with `Object.is` and `Combobox.Root` does not expose
 * `isItemEqualToValue`, so a re-fetched twin of the same row would stop reading
 * as selected. Keeping the picked object means identity holds, and prepending it
 * to the results keeps it visible when the query no longer matches it.
 */
export function EntityCombobox({
  resource,
  value,
  initialLabel,
  onChange,
  placeholder = "Tìm và chọn…",
  id,
  className,
  disabled,
}: {
  resource: "clients" | "projects";
  value: number | null;
  /** Label for a value that was preselected server-side (e.g. a prefill). */
  initialLabel?: string;
  onChange: (value: number | null) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<EntityOption | null>(() =>
    value && initialLabel ? { value, label: initialLabel } : null
  );
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query);

  const { rows, total, isFetching, isError } = useFilterList<Row>({
    resource,
    params: {
      page: 1,
      limit: LIMIT,
      search,
      ...(SORT[resource] ?? { sortBy: "created_at", sortOrder: "desc" }),
    },
  });

  const options: EntityOption[] = rows.map((row) => ({
    value: row.id,
    label: row.code
      ? `${row.code} · ${row.name ?? ""}`.trim()
      : (row.name ?? `#${row.id}`),
  }));
  // The current pick stays in the list even when the query has moved past it,
  // so the popup can show it as selected instead of looking empty.
  const items =
    selected && !options.some((o) => o.value === selected.value)
      ? [selected, ...options]
      : options;

  // Say when the server has more than this page rather than looking complete —
  // the silent window is the bug this component exists to fix.
  const moreThanShown = total > rows.length ? total - rows.length : 0;

  const handleValueChange = (next: EntityOption | null) => {
    setSelected(next);
    onChange(next?.value ?? null);
  };

  return (
    <Combobox.Root
      items={items}
      value={selected}
      onValueChange={handleValueChange}
      inputValue={query}
      onInputValueChange={setQuery}
      disabled={disabled}
      // Filtering is the server's job here; leaving Base UI's own filter on
      // would hide rows the API deliberately returned.
      filter={null}
    >
      <div className={cn("relative", className)}>
        <Combobox.Input
          render={<Input id={id} placeholder={placeholder} className="pr-14" />}
        />
        <div className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center">
          {isFetching ? (
            <Loader2 className="mr-1 size-3.5 animate-spin text-muted-foreground" />
          ) : null}
          {selected ? (
            <Combobox.Clear
              className="rounded-sm p-1 text-muted-foreground hover:text-foreground"
              aria-label="Bỏ chọn"
            >
              <X className="size-3.5" />
            </Combobox.Clear>
          ) : null}
          <Combobox.Trigger
            className="rounded-sm p-1 text-muted-foreground hover:text-foreground"
            aria-label="Mở danh sách"
          >
            <ChevronsUpDown className="size-3.5" />
          </Combobox.Trigger>
        </div>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} align="start" className="z-50">
          <Combobox.Popup className="max-h-72 w-[var(--anchor-width)] max-w-[var(--available-width)] overflow-y-auto rounded-lg bg-popover py-1 text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none">
            {isError ? (
              <p className="px-3 py-2 text-destructive">
                Không tải được danh sách — thử lại.
              </p>
            ) : null}
            <Combobox.Empty className="px-3 py-2 text-muted-foreground empty:hidden">
              {isFetching ? "Đang tìm…" : "Không có kết quả."}
            </Combobox.Empty>
            <Combobox.List>
              {(item: EntityOption) => (
                <Combobox.Item
                  key={item.value}
                  value={item}
                  className="cursor-default px-3 py-2 data-highlighted:bg-muted data-selected:font-medium"
                >
                  {item.label}
                </Combobox.Item>
              )}
            </Combobox.List>
            {moreThanShown > 0 ? (
              <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                Còn {moreThanShown} kết quả — nhập thêm để thu hẹp.
              </p>
            ) : null}
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
