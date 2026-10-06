/**
 * Attachment `kind` — the file's category. Mirrors `ATTACHMENT_KINDS` in both
 * backends (crm-api-nest projects.module.ts / crm-api models/project.py), which
 * also decide the owner and the link each kind needs — a wrong pairing is a 400.
 * Vietnamese names: `ATTACHMENT_KINDS` in `@/constants/labels`.
 */
export enum AttachmentKind {
  SURVEY = "survey",
  SIGNED_QUOTE = "signed_quote",
  SIGNED_CONTRACT = "signed_contract",
  PAYMENT_PROOF = "payment_proof",
  PAPERWORK = "paperwork",
  SITE_LOG = "site_log",
  FINISH_IMAGE = "finish_image",
  DEFECT_IMAGE = "defect_image",
  ACCEPTANCE_REPORT = "acceptance_report",
  SETTLEMENT = "settlement",
  VAT_INVOICE = "vat_invoice",
  OTHER = "other",
  ID_CARD = "id_card",
  CERTIFICATE = "certificate",
}
