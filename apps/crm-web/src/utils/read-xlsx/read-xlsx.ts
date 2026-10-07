import { DOMParser } from "@xmldom/xmldom";
import JSZip from "jszip";

/**
 * Minimal .xlsx reader: every sheet as rows of literal cell values. An .xlsx is
 * a zip of XML parts — `jszip` + `@xmldom/xmldom` (both already shipped as
 * mammoth's deps) read it without a spreadsheet library.
 *
 * Formula cells yield the value Excel CACHED on save; nothing is recalculated.
 * Styles, merges and number formats are ignored (a date stays its serial).
 */
export type CellValue = string | number;

export type SheetRow = {
  row: number; // 1-based, as Excel numbers it
  cells: Map<string, CellValue>; // column letters ("A", "AB") → value
};

/** Sheet name → its non-empty rows, in sheet order. */
export type Workbook = Map<string, SheetRow[]>;

const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

// xmldom's NodeList is index-accessible but not typed as an element list.
const list = (nodes: unknown) => Array.from(nodes as ArrayLike<Element>);

const els = (parent: Element, name: string) =>
  list(parent.getElementsByTagNameNS(MAIN, name));

// <si>/<is> text: every <t> run, minus the phonetic guide (<rPh>) runs.
const runText = (el: Element) =>
  els(el, "t")
    .filter((t) => (t.parentNode as Element | null)?.localName !== "rPh")
    .map((t) => t.textContent ?? "")
    .join("");

const parse = async (zip: JSZip, path: string) => {
  const file = zip.file(path);
  if (!file) throw new Error(`xlsx part missing: ${path}`);
  return new DOMParser().parseFromString(await file.async("string"), "text/xml")
    .documentElement as Element;
};

/** Throws when the bytes are not an .xlsx (not a zip, or parts missing). */
export async function readXlsx(
  data: ArrayBuffer | Uint8Array
): Promise<Workbook> {
  const zip = await JSZip.loadAsync(data);

  const shared = zip.file("xl/sharedStrings.xml")
    ? els(await parse(zip, "xl/sharedStrings.xml"), "si").map(runText)
    : [];

  const rels = new Map(
    list(
      (await parse(zip, "xl/_rels/workbook.xml.rels")).getElementsByTagName(
        "Relationship"
      )
    ).map((r) => [r.getAttribute("Id"), r.getAttribute("Target") ?? ""])
  );

  const workbook: Workbook = new Map();
  for (const sheet of els(await parse(zip, "xl/workbook.xml"), "sheet")) {
    const target = rels.get(sheet.getAttributeNS(REL, "id")) ?? "";
    // Targets are relative to xl/ unless absolute within the package.
    const path = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
    const rows: SheetRow[] = [];
    for (const row of els(await parse(zip, path), "row")) {
      const cells = new Map<string, CellValue>();
      for (const c of els(row, "c")) {
        const value = cellValue(c, shared);
        if (value !== undefined && value !== "")
          cells.set((c.getAttribute("r") ?? "").replace(/\d+/g, ""), value);
      }
      if (cells.size) rows.push({ row: Number(row.getAttribute("r")), cells });
    }
    workbook.set(sheet.getAttribute("name") ?? "", rows);
  }
  return workbook;
}

function cellValue(c: Element, shared: string[]): CellValue | undefined {
  const type = c.getAttribute("t");
  if (type === "inlineStr") return runText(c);
  const v = els(c, "v")[0]?.textContent;
  if (v == null || type === "e") return undefined; // #REF!, #DIV/0! … → empty
  if (type === "s") return shared[Number(v)];
  if (type === "str") return v;
  if (type === "b") return v === "1" ? "TRUE" : "FALSE";
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

/** "A" → 1, "AB" → 28. */
export const columnIndex = (letters: string) =>
  [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);

/** 1 → "A", 28 → "AB". */
export const columnLetters = (index: number): string =>
  index <= 0
    ? ""
    : columnLetters(Math.floor((index - 1) / 26)) +
      String.fromCharCode(65 + ((index - 1) % 26));
