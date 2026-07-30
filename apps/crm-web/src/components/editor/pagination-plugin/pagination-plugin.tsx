"use client";

/**
 * PaginationPlugin — Google-Docs-style page breaks for the on-page editor.
 *
 * The editable surface stays ONE tall `.print-sheet`; this plugin makes it read
 * as a stack of A4 pages: after every editor update it measures each top-level
 * block (plus the sheet's trailing elements, e.g. the signature blocks) and,
 * when a block would straddle a page boundary, pushes it to the next page with
 * a `margin-top`. Grey "gap" bands are then drawn over the boundaries so the
 * sheet looks like separate pages.
 *
 * Screen-only chrome: bands are `print:hidden` and the pushes/min-height are
 * neutralised under `@media print` (globals.css) — the browser's own print
 * pagination takes over there.
 *
 * ponytail: block-level pagination only — a single block taller than a page
 * (huge table/paragraph) overflows its page instead of splitting mid-block;
 * upgrade path is mid-block splitting à la real word processors.
 */
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Visual gap between pages, px. */
const GAP = 32;
/** On-screen page height derived from the sheet's width (A4 = 210×297mm). */
const A4_RATIO = 297 / 210;
/** Interior top/bottom page padding, matching the sheet's `p-10` (2.5rem). */
const PAD = 40;

export function PaginationPlugin() {
  const [editor] = useLexicalComposerContext();
  const [sheet, setSheet] = useState<HTMLElement | null>(null);
  const [bands, setBands] = useState<number[]>([]);

  useEffect(() => {
    const root = editor.getRootElement();
    const sheetEl = root?.closest<HTMLElement>(".print-sheet") ?? null;
    if (!root || !sheetEl) return;
    sheetEl.style.position = "relative";

    let frame = 0;

    const layout = () => {
      setSheet(sheetEl);
      const pageHeight = Math.round(sheetEl.offsetWidth * A4_RATIO);
      const stride = pageHeight + GAP;

      // Blocks that may be pushed: the editor's top-level blocks, then the
      // sheet elements after the editable (signature blocks etc.). The header
      // and title above the editable stay put on page 1.
      const trailing: HTMLElement[] = [];
      for (
        let el = root.parentElement?.nextElementSibling;
        el;
        el = el.nextElementSibling
      ) {
        trailing.push(el as HTMLElement);
      }
      const blocks = [
        ...(Array.from(root.children) as HTMLElement[]),
        ...trailing,
      ];

      for (const el of blocks) {
        el.classList.remove("page-push");
        el.style.marginTop = "";
      }

      // Each assignment reflows before the next measurement, so `top` already
      // includes every push applied to earlier blocks.
      const sheetTop = sheetEl.getBoundingClientRect().top;
      for (const el of blocks) {
        const r = el.getBoundingClientRect();
        const top = r.top - sheetTop;
        const page = Math.floor(top / stride);
        const contentBottom = page * stride + pageHeight - PAD;
        if (
          top + r.height > contentBottom &&
          r.height <= pageHeight - 2 * PAD
        ) {
          el.style.marginTop = `${(page + 1) * stride + PAD - top}px`;
          el.classList.add("page-push");
        }
      }

      const pages = Math.max(1, Math.ceil(sheetEl.scrollHeight / stride));
      sheetEl.style.minHeight = `${pages * stride - GAP}px`;

      const next = Array.from(
        { length: pages - 1 },
        (_, i) => (i + 1) * stride - GAP
      );
      setBands((prev) =>
        prev.length === next.length && prev.every((v, i) => v === next[i])
          ? prev
          : next
      );
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(layout);
    };

    schedule();
    const unregister = editor.registerUpdateListener(schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(sheetEl);

    return () => {
      cancelAnimationFrame(frame);
      unregister();
      observer.disconnect();
    };
  }, [editor]);

  if (!sheet) return null;

  return createPortal(
    bands.map((top) => (
      <div
        key={top}
        aria-hidden
        className="absolute -inset-x-px z-10 border-y border-border bg-muted print:hidden"
        style={{ top, height: GAP }}
      />
    )),
    sheet
  );
}
