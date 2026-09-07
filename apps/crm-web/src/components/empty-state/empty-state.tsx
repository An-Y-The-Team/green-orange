import type { ReactNode } from "react";

import { Button } from "@yan/ui/components/button";
import { cn } from "@yan/ui/lib/utils";

/**
 * "Nothing here yet" — and what to do about it.
 *
 * The app had 31 of these and exactly two offered the action that resolves the
 * emptiness; the other 29 were a full stop ("Chưa có báo giá.", "Chưa có hồ
 * sơ.", "Chưa có ghi chú."). A panel that names a gap and then leaves the reader
 * to find the button themselves is a dead end, and on the stage panels the
 * button is the entire point of the screen.
 *
 * Layout-agnostic on purpose: list pages wrap it in a `<TableCell colSpan>`,
 * panels drop it straight into a card.
 */
export function EmptyState({
  message,
  action,
  className,
}: {
  message: ReactNode;
  /** The thing that makes it non-empty. Omit only when there genuinely isn't one. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 text-sm text-muted-foreground",
        className
      )}
    >
      <span>{message}</span>
      {action}
    </div>
  );
}

/**
 * The list-page variant, which has to answer a second question first: is this
 * table empty because the database is, or because the operator's filters
 * exclude everything?
 *
 * All four lists used to say "Không có {noun} nào khớp bộ lọc" either way — so a
 * brand-new install told its first user that their filters were wrong. That is
 * the failure this split exists to prevent.
 */
export function ListEmptyState({
  noun,
  filtered,
  onClearFilters,
  action,
}: {
  /** Lowercase entity noun: "công trình", "báo giá", … */
  noun: string;
  /** Whether any filter or search is currently narrowing the list. */
  filtered: boolean;
  onClearFilters: () => void;
  /** Shown when the list is genuinely empty — usually the create button. */
  action?: ReactNode;
}) {
  return filtered ? (
    <EmptyState
      message={`Không có ${noun} nào khớp bộ lọc.`}
      action={
        <Button size="sm" variant="outline" onClick={onClearFilters}>
          Xóa bộ lọc
        </Button>
      }
    />
  ) : (
    <EmptyState message={`Chưa có ${noun} nào.`} action={action} />
  );
}
