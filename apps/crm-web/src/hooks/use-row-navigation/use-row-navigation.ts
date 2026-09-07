"use client";

import { useRouter } from "next/navigation";

/**
 * Whole-row navigation for a list table.
 *
 * Only the FIRST cell of each row was ever a link — the project *code*, about
 * eight characters wide — while the cell a reader actually aims at (the name,
 * immediately to its right) did nothing. There was no hover affordance either,
 * so the row gave no sign it was clickable at all.
 *
 * The real `<Link>` stays on the primary cell: it is what keeps keyboard
 * traversal, middle-click and "open in new tab" working, none of which a row
 * `onClick` can provide. This only adds the large pointer target on top.
 */
export function useRowNavigation() {
  const router = useRouter();

  return (href: string) => ({
    className: "cursor-pointer",
    onClick: (event: React.MouseEvent<HTMLTableRowElement>) => {
      // Anything interactive inside the row owns its own click: the primary
      // cell's link (which would otherwise fire twice) and the action buttons
      // in the last column, where navigating away instead of acting is the
      // worst possible outcome.
      const target = event.target as HTMLElement;
      if (target.closest("a,button,input,select,textarea,[role=dialog]"))
        return;
      // Modifier-clicks mean "somewhere else", and a text selection means the
      // user was reading, not navigating.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      if (window.getSelection()?.toString()) return;
      router.push(href);
    },
  });
}
