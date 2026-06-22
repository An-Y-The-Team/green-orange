"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { initializeVisualEditor } from "@/lib/visual-editor/visual-editor";

// Initializes the Directus Visual Editor on the client. Rendered ONLY in
// preview/draft mode (see page.tsx). Uses a callback ref — which fires once
// after the node mounts — instead of useEffect, per AGENTS.md's no-useEffect
// guidance. On save, refreshes the route so the iframe shows the new content.
export function VisualEditorInit() {
  const router = useRouter();

  const initRef = useCallback(
    (node: HTMLSpanElement | null) => {
      if (!node) return;
      void initializeVisualEditor({ onSaved: () => router.refresh() });
    },
    [router]
  );

  return <span ref={initRef} hidden aria-hidden data-visual-editor-init />;
}
