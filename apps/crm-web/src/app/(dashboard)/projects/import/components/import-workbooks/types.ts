import type { ProjectStage } from "../../../enums";
import type { ImportField } from "../../enums";
import type { ImportResult, ParsedWorkbook, WorkbookMatch } from "../../types";

/** One dropped file, from parse to result. Lives only in the page's state. */
export interface ImportRow {
  key: string;
  file: File;
  /** null = not readable as the Báo giá template. */
  workbook: ParsedWorkbook | null;
  /** What the FILE left blank — the card's inputs, fixed at parse time. */
  blankFields: ImportField[];
  /** True while the server looks up the existing client / site / contact. */
  matching: boolean;
  match?: WorkbookMatch;
  matchError?: string;
  /** The operator's choices — prefilled from the file and the match. */
  stage: ProjectStage;
  typeIds: number[];
  result?: ImportResult;
  /** The project exists but the original workbook could not be filed on it. */
  attachError?: string;
}
