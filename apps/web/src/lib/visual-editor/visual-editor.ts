import { apply, remove } from "@directus/visual-editing";

import { CMS_URL } from "@/lib/cms-url";

// Initialize the Directus Visual Editor overlay once on the client. Editable
// elements opt in via `data-directus` attributes (see setAttr usage in the
// section components). `onSaved` re-runs the server components so the preview
// reflects the just-saved change. Safe to call more than once.
let isApplied = false;

export const initializeVisualEditor = async ({
  onSaved,
}: {
  onSaved: () => void;
}): Promise<void> => {
  if (typeof window === "undefined" || isApplied) return;
  try {
    await apply({ directusUrl: CMS_URL, onSaved: () => onSaved() });
    isApplied = true;
  } catch (error: unknown) {
    console.error("Failed to initialize Directus Visual Editor:", error);
  }
};

export const cleanupVisualEditor = (): void => {
  if (typeof window === "undefined" || !isApplied) return;
  remove();
  isApplied = false;
};
