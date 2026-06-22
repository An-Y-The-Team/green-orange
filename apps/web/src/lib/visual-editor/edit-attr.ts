import { setAttr } from "@directus/visual-editing";

export type EditMode = "popover" | "drawer" | "modal";

// Build a `data-directus` attribute value for the Visual Editor, or `undefined`
// when there is no item id (e.g. content fell back to DEFAULT_SETTINGS or the
// CMS was unreachable) — `data-directus={undefined}` renders no attribute, so
// the overlay simply doesn't attach. `setAttr` is a pure string serializer and
// is safe to call from both server and client components.
export const editAttr = ({
  collection,
  item,
  fields,
  mode = "popover",
}: {
  collection: string;
  item: number | string | null | undefined;
  fields: string | string[];
  mode?: EditMode;
}): string | undefined => {
  if (item === null || item === undefined) return undefined;
  return setAttr({ collection, item, fields, mode });
};
