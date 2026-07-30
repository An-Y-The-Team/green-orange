"use client";

import { Check, CloudOff, Loader2, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "invalid";

/**
 * Debounced autosave loop shared by the document editors (contract, template).
 *
 * Call `schedule(persist)` on every change — the latest scheduled `persist`
 * wins, and changes arriving while a save is in flight trigger exactly one
 * follow-up save. `persist` returns `true` (saved), `false` (server/network
 * error) or `"invalid"` (form not saveable yet — e.g. a required name missing).
 * `flush()` runs any pending save immediately and reports whether it is safe
 * to navigate away.
 */
export function useAutosave(initial: SaveStatus = "idle", delayMs = 1500) {
  const [status, setStatus] = useState<SaveStatus>(initial);
  const fn = useRef<(() => Promise<boolean | "invalid">) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inflight = useRef(false);
  const dirty = useRef(false);

  const run = async (): Promise<boolean> => {
    if (!fn.current) return true;
    if (inflight.current) {
      dirty.current = true;
      return false;
    }
    inflight.current = true;
    setStatus("saving");
    const ok = await fn.current();
    inflight.current = false;
    setStatus(ok === true ? "saved" : ok === "invalid" ? "invalid" : "error");
    if (dirty.current) {
      dirty.current = false;
      void run();
    }
    return ok === true;
  };

  const schedule = (persist: () => Promise<boolean | "invalid">) => {
    fn.current = persist;
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void run(), delayMs);
  };

  const flush = async (): Promise<boolean> => {
    clearTimeout(timer.current);
    if (status === "saved" || !fn.current) return true;
    return run();
  };

  return { status, schedule, flush };
}

/** The Docs-style "Đang lưu… / Đã lưu" indicator for the editor toolbars. */
export function SaveStatusBadge({
  status,
  invalidHint = "Chưa thể lưu",
}: {
  status: SaveStatus;
  /** Shown for `invalid` — say what's missing (e.g. "cần tên mẫu"). */
  invalidHint?: string;
}) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      {status === "saving" && (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          Đang lưu…
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="size-3.5 text-emerald-600" />
          Đã lưu
        </>
      )}
      {status === "error" && (
        <>
          <CloudOff className="size-3.5 text-destructive" />
          Lỗi khi lưu
        </>
      )}
      {status === "invalid" && (
        <>
          <TriangleAlert className="size-3.5 text-amber-600" />
          {invalidHint}
        </>
      )}
    </span>
  );
}
