import { CMS_URL } from "@/lib/cms-url";

// Build a public Directus asset URL from a file id. Returns null when there is
// no file, so callers can fall back to a default. The browser fetches assets
// from the public CMS origin (NEXT_PUBLIC_CMS_URL).
export const assetUrl = ({
  fileId,
}: {
  fileId: string | null | undefined;
}): string | null => {
  if (!fileId) return null;
  return `${CMS_URL}/assets/${fileId}`;
};
