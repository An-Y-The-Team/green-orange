import { ApiError, apiFetchSafe } from "@/utils/http/http";

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

/**
 * A crew member's CCCD and chứng chỉ. The backend serves them to crm-admins
 * only and answers 403 to everyone else — `null` tells the page to say so
 * instead of showing two lists that look empty. Every other failure follows
 * `apiFetchSafe`: 501 degrades to `[]`, an outage reaches error.tsx rather
 * than reading as "no papers".
 */
export async function listCrewAttachments(
  crewMemberId: number
): Promise<Attachment[] | null> {
  try {
    return await apiFetchSafe<Attachment[]>(
      `/attachments?crew_member_id=${crewMemberId}&limit=500`,
      []
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return null;
    throw err;
  }
}
