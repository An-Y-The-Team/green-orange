import type { AttachmentKind } from "./enums";

/** Who a file belongs to — exactly one (DB CHECK `attachment_one_owner`). */
export type AttachmentOwner =
  | { project_id: number }
  | { crew_member_id: number };

/**
 * The one record a file documents. Which key a kind needs is fixed by the
 * backends; passing the wrong one (or none) answers 400.
 */
export interface AttachmentLink {
  quote_id?: number;
  contract_id?: number;
  payment_milestone_id?: number;
  bill_id?: number;
  paperwork_item_id?: number;
}

/** A file in the bucket plus what it is and where it belongs. */
export interface Attachment extends AttachmentLink {
  id: number;
  project_id: number | null;
  crew_member_id: number | null;
  kind: AttachmentKind;
  s3_key: string;
  note?: string | null;
  created_at: string;
}

/**
 * `POST /attachments/presign` — a signed URL the browser PUTs the bytes to.
 * The response also carries `expires_in`; it is left out here because nothing
 * reads it — the URL is minted per upload and used immediately.
 */
export interface AttachmentPresign {
  upload_url: string;
  s3_key: string;
}
