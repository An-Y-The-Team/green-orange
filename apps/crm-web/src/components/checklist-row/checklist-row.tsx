import { Circle, CircleCheckBig } from "lucide-react";
import type { ReactNode } from "react";

/**
 * One "điều kiện hoàn thành" row: a tick or an empty circle, the condition, and
 * optionally the fact behind it plus the button that satisfies it.
 *
 * Was private to `panels/contract/contract.tsx`, the one panel out of eight that
 * had a gate checklist at all (`crm-ui-redesign.md` Zone 2 specified one per
 * stage). Promoted so every stage can render the same row.
 *
 * The tick is not the only cue: an unmet row is also muted, so the state does
 * not rest on colour alone.
 */
export function ChecklistRow({
  done,
  label,
  detail,
  action,
}: {
  done: boolean;
  label: string;
  detail?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {done ? (
        <CircleCheckBig
          aria-hidden
          className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
        />
      ) : (
        <Circle aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      )}
      {/* Said out loud, because the icon is the only thing that carries it. */}
      <span className="sr-only">{done ? "đã xong:" : "còn thiếu:"}</span>
      <span className={done ? "" : "text-muted-foreground"}>{label}</span>
      {detail ? <span className="ml-auto">{detail}</span> : null}
      {action ? (
        <span className={detail ? "" : "ml-auto"}>{action}</span>
      ) : null}
    </div>
  );
}
