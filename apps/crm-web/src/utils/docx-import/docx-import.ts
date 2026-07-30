/**
 * Convert a .docx file (ArrayBuffer) to an HTML string with mammoth.
 *
 * `mammoth` is heavy and only needed when an author actually imports a file, so
 * it is **dynamically imported** here — it never enters the editor route's
 * initial JS bundle. Runs entirely client-side: the document never leaves the
 * browser (matches the VPN-only/internal posture in AGENTS.md).
 */
export async function docxToHtml(arrayBuffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.convertToHtml({ arrayBuffer });
  return value;
}
