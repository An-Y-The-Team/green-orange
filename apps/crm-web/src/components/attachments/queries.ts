import { apiFetchSafe } from "@/utils/http/http";

import type { Attachment, AttachmentOwner } from "./types";

/**
 * Every file of one project or crew member, newest first — fetched once per
 * page and filtered per panel by kind + link. `limit=500` is the backend max:
 * the default page of 100 silently dropped the oldest files of a busy job.
 * ponytail: one page, add paging if a single owner ever passes 500 files.
 */
export async function listAttachments(
  owner: AttachmentOwner
): Promise<Attachment[]> {
  const [key, id] = Object.entries(owner)[0];
  return apiFetchSafe<Attachment[]>(`/attachments?${key}=${id}&limit=500`, []);
}
