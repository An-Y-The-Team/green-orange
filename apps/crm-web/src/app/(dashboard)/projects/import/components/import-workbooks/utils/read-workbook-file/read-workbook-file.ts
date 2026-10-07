import { ProjectStage } from "../../../../../enums";
import type { ImportRow } from "../../types";

/**
 * A picked file → a row, parsed IN THE BROWSER: the workbook never leaves it
 * (same posture as the .docx import), and only the parsed fields go to the
 * server. The reader and parser are loaded on first use, so they never weigh
 * on the page's initial bundle.
 */
export async function readWorkbookFile({
  file,
}: {
  file: File;
}): Promise<ImportRow> {
  // Also an element-id prefix, so no file name in it (spaces). Not
  // crypto.randomUUID: it only exists on secure origins, and the CRM may be
  // served over plain http inside the VPN.
  const key = `wb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  try {
    const [{ readXlsx }, { parseQuoteWorkbook }] = await Promise.all([
      import("@/utils/read-xlsx/read-xlsx"),
      import("../../../../utils/parse-quote-workbook/parse-quote-workbook"),
    ]);
    const workbook = parseQuoteWorkbook(
      await readXlsx(await file.arrayBuffer())
    );
    return {
      key,
      file,
      workbook,
      matching: true,
      stage: workbook.stage,
      typeIds: [],
    };
  } catch {
    // Not a zip / not an .xlsx at all (an .xls, a renamed PDF …).
    return {
      key,
      file,
      workbook: null,
      matching: false,
      stage: ProjectStage.QUOTE,
      typeIds: [],
    };
  }
}
