"use client";

import { Check, CloudOff, Loader2, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "invalid";

/**
 * What one save attempt reported. `message` is the server's own wording — it is
 * the only place actionable refusals surface (e.g. save-template's "mẫu dùng
 * trường trộn không tồn tại"), so it must reach the UI rather than collapse to
 * a bare "failed".
 */
export type SaveResult =
  | { status: "saved" }
  /** Not saveable yet — client-side, e.g. a required name still empty. */
  | { status: "invalid"; message?: string }
  | { status: "error"; message?: string };

const SAVED: SaveResult = { status: "saved" };

/**
 * Debounced autosave loop shared by the document editors (contract, template,
 * company profile).
 *
 * Call `schedule(persist)` on every change — the latest scheduled `persist`
 * wins, and changes arriving while a save is in flight trigger exactly one
 * follow-up save. `flush()` runs any pending save immediately and returns its
 * result, so a caller can explain why it is refusing to navigate away.
 */
export function useAutosave(initial: SaveStatus = "idle", delayMs = 1500) {
  const [status, setStatus] = useState<SaveStatus>(initial);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const fn = useRef<(() => Promise<SaveResult>) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inflight = useRef(false);
  const dirty = useRef(false);

  const run = async (): Promise<SaveResult> => {
    if (!fn.current) return SAVED;
    if (inflight.current) {
      // Coalesce: the in-flight save will re-run for this change when it lands.
      dirty.current = true;
      return { status: "error", message: undefined };
    }
    inflight.current = true;
    setStatus("saving");

    let result: SaveResult;
    try {
      result = await fn.current();
    } catch (error) {
      // A rejection here (network blip, deploy mid-save) must not strand
      // `inflight` — that would wedge autosave permanently on "Đang lưu…".
      result = {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Không kết nối được máy chủ.",
      };
    } finally {
      inflight.current = false;
    }

    setStatus(result.status);
    setMessage(result.status === "saved" ? undefined : result.message);

    if (dirty.current) {
      dirty.current = false;
      void run();
    }
    return result;
  };

  const schedule = (persist: () => Promise<SaveResult>) => {
    fn.current = persist;
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void run(), delayMs);
  };

  const flush = async (): Promise<SaveResult> => {
    clearTimeout(timer.current);
    if (status === "saved" || !fn.current) return SAVED;
    return run();
  };

  return { status, message, schedule, flush };
}

/**
 * The Docs-style "Đang lưu… / Đã lưu" indicator for the editor toolbars. On a
 * failure it also shows the server's reason — truncated inline, full text on
 * hover — because that is often the only actionable instruction the author gets.
 */
export function SaveStatusBadge({
  status,
  message,
  invalidHint = "Chưa thể lưu",
}: {
  status: SaveStatus;
  /** Server-supplied reason for `error` / `invalid`. */
  message?: string;
  /** Shown for `invalid` when no message — say what's missing. */
  invalidHint?: string;
}) {
  const failed = status === "error" || status === "invalid";

  return (
    <span
      className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground"
      title={failed ? message : undefined}
    >
      {status === "saving" && (
        <>
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
          Đang lưu…
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="size-3.5 shrink-0 text-emerald-600" />
          Đã lưu
        </>
      )}
      {status === "error" && (
        <CloudOff className="size-3.5 shrink-0 text-destructive" />
      )}
      {status === "invalid" && (
        <TriangleAlert className="size-3.5 shrink-0 text-amber-600" />
      )}
      {failed && (
        <span className="max-w-64 truncate">
          {message ?? (status === "invalid" ? invalidHint : "Lỗi khi lưu")}
        </span>
      )}
    </span>
  );
}
