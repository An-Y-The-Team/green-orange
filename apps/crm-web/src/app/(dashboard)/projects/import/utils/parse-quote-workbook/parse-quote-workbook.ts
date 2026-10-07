import { ClientType } from "@/app/(dashboard)/clients/enums";
import {
  type CellValue,
  type SheetRow,
  type Workbook,
  columnIndex,
  columnLetters,
} from "@/utils/read-xlsx/read-xlsx";

import { ProjectStage } from "../../../enums";
import { CoverBlock, PriceColumn } from "../../enums";
import type { ParsedItem, ParsedMoney, ParsedWorkbook } from "../../types";

/**
 * Reads ONE operator workbook — the template operators already fill in
 * (`01. MẪU FILE HỒ SƠ/Mẫu Báo giá - Nghiem thu - Quyet toan - DNTT.xlsx`) — into
 * what a new công trình needs. Nothing about the template is changed or asked
 * of the operator.
 *
 * Everything is found by its printed LABEL, never by a fixed cell address:
 * operators insert and delete rows, and type a value either after the label
 * ("Công trình: Bread Talk") or in the next column ("Bên A:" | "CÔNG TY …").
 *
 * - `Bia`: the cover sheet, the only place the header fields are typed.
 * - `Bang bao gia`: the priced lines (→ quote).
 * - `Biên bảng nghiệm thu`: a "Khối lượng nghiệm thu" filled in → stage acceptance.
 * - `quyết toán khối lượng`: a "Khối lượng thực tế" filled in → stage settlement
 *   plus its lines.
 */
export function parseQuoteWorkbook(workbook: Workbook): ParsedWorkbook {
  const errors: string[] = [];
  const warnings: string[] = [];

  const cover = sheet(workbook, (n) => n === "bia");
  const quoteRows = sheet(workbook, (n) => n.includes("bao gia"));
  if (!cover) errors.push("Không thấy sheet Bia.");
  if (!quoteRows) errors.push("Không thấy sheet Bảng báo giá.");

  const head = readCover(cover ?? []);
  if (!head.project.name) errors.push("Bia: chưa điền tên công trình.");
  if (!head.project.site_address)
    errors.push("Bia: chưa điền địa chỉ công trình.");
  if (!head.client.name) errors.push("Bia: chưa điền tên Bên A.");

  const quote = readMoney(quoteRows ?? [], QUOTE_COLUMNS, "Bảng báo giá");
  errors.push(...quote.errors);
  warnings.push(...quote.warnings);
  if (quoteRows && !quote.items.length && !quote.errors.length)
    errors.push(
      "Bảng báo giá: chưa có dòng nào điền cả khối lượng và đơn giá."
    );

  const acceptanceRows = sheet(workbook, (n) => n.includes("nghiem thu"));
  const accepted = readMoney(
    acceptanceRows ?? [],
    ACCEPTANCE_COLUMNS,
    "Nghiệm thu",
    { quantityOnly: true }
  ).items.some((it) => it.quantity > 0);

  const settlementRows = sheet(workbook, (n) => n.includes("quyet toan"));
  const settled = settlementRows
    ? readMoney(settlementRows, SETTLEMENT_COLUMNS, "Quyết toán")
    : null;
  const hasSettlement = !!settled?.items.some((it) => it.quantity > 0);
  if (hasSettlement) {
    errors.push(...settled!.errors);
    warnings.push(...settled!.warnings);
  }

  return {
    ...head,
    quote: money(quote),
    settlement: hasSettlement ? money(settled!) : null,
    stage: hasSettlement
      ? ProjectStage.SETTLEMENT
      : accepted
        ? ProjectStage.ACCEPTANCE
        : ProjectStage.QUOTE,
    errors,
    warnings,
  };
}

// ── Matching keys ─────────────────────────────────────────────────────────

/** Lower-case, no diacritics, đ→d: "Mã số thuế" → "ma so thue". */
export const fold = (s: string) =>
  [...s.normalize("NFC")].map(foldChar).join("").toLowerCase();

// One char in, one char out — so an index into the folded string is an index
// into the original's code points, which is how a label is cut off its value.
const foldChar = (ch: string) =>
  ch
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

const text = (v: CellValue | undefined) =>
  v === undefined ? "" : String(v).trim();

// What the template leaves in an unfilled field: "XYZ", "ABC", ".", "…….".
const PLACEHOLDER = /^(?:[\s.…_\-–]*|xyz|abc)$/i;
const filled = (s: string) => {
  const t = s.trim();
  return PLACEHOLDER.test(t) ? "" : t;
};

const sheet = (wb: Workbook, match: (folded: string) => boolean) =>
  [...wb].find(([name]) => match(fold(name).replace(/\s+/g, " ").trim()))?.[1];

// ── Bia (cover) ───────────────────────────────────────────────────────────

/**
 * The value printed after `label` in this row: the rest of the label's own
 * cell, else the cell immediately to its right. Only the adjacent column — the
 * template's own instructions sit further right ("tên công trình" in F4).
 */
function labelled(row: SheetRow, label: RegExp): string | null {
  for (const [col, value] of row.cells) {
    const original = [...text(value).normalize("NFC")];
    const match = label.exec(fold(original.join("")));
    if (!match) continue;
    const rest = filled(original.slice(match[0].length).join(""));
    if (rest) return rest;
    const next = row.cells.get(columnLetters(columnIndex(col) + 1));
    return next === undefined ? "" : filled(text(next));
  }
  return null;
}

const HONORIFIC = /^(?:ông|bà|anh|chị)\s+/i;

// Each anchored at the start of a cell; an optional ":" closes the label.
const L = {
  project: /^\s*cong trinh\s*:?/,
  codeRef: /^\s*ma so ct\s*:?/,
  work: /^\s*cong viec\s*:?/,
  date: /^\s*ngay\s*:?/,
  address: /^\s*dia chi\s*:?/,
  partyA: /^\s*ben a\s*:?/,
  partyB: /^\s*ben b\b/,
  // The honorific only as a whole word: "Bạch Văn Long" folds to "bach …".
  rep: /^\s*dai dien boi\s*(?:(?:ong|ba|anh|chi)(?![\p{L}\p{N}]))?\s*[:.]?/u,
  title: /^\s*chuc vu\s*:?/,
  taxCode: /^\s*ma so thue\s*:?/,
  phone: /^\s*dien thoai\s*:?/,
};

function readCover(rows: SheetRow[]) {
  // The cover reads top-down in three blocks: the job, then Bên B (the
  // company itself — skipped), then Bên A (the client). "Địa chỉ" appears in
  // all three, so which block a row sits in decides what it means.
  let block = CoverBlock.JOB;
  const job: Record<string, string> = {};
  const client: Record<string, string> = {};
  const take = (
    into: Record<string, string>,
    key: string,
    v: string | null
  ) => {
    if (v !== null && !into[key]) into[key] = v;
  };

  for (const row of rows) {
    if (labelled(row, L.partyB) !== null) block = CoverBlock.COMPANY;
    const partyA = labelled(row, L.partyA);
    if (partyA !== null) {
      block = CoverBlock.CLIENT;
      take(client, "name", partyA);
    }
    if (block === CoverBlock.JOB) {
      take(job, "name", labelled(row, L.project));
      take(job, "code_ref", labelled(row, L.codeRef));
      take(job, "work", labelled(row, L.work));
      take(job, "date", labelled(row, L.date));
      take(job, "site_address", labelled(row, L.address));
    } else if (block === CoverBlock.CLIENT) {
      take(client, "rep", labelled(row, L.rep));
      take(client, "title", labelled(row, L.title));
      take(client, "address", labelled(row, L.address));
      take(client, "tax_code", labelled(row, L.taxCode));
      take(client, "phone", labelled(row, L.phone));
    }
  }

  const name = client.name ?? "";
  const taxCode = restoreLeadingZero(
    (client.tax_code ?? "").replace(/[^\d-]/g, ""),
    [9, 12]
  );
  const rep = (client.rep ?? "").replace(HONORIFIC, "").trim();
  const phone = restoreLeadingZero((client.phone ?? "").trim(), [9]);
  return {
    project: {
      name: job.name ?? "",
      code_ref: job.code_ref || undefined,
      type_names: (job.work ?? "")
        .split(/\s*(?:[/,;+&]|\svà\s)\s*/i)
        .map((s) => s.trim())
        .filter(Boolean),
      date: job.date ? excelDate(job.date) : undefined,
      site_address: job.site_address ?? "",
    },
    client: {
      name,
      type:
        taxCode || /^c[oô]ng ty\b/i.test(name)
          ? ClientType.COMPANY
          : ClientType.INDIVIDUAL,
      tax_code: taxCode || undefined,
      address: client.address || undefined,
    },
    contact: rep
      ? {
          name: rep,
          title: client.title || undefined,
          phone: phone ? (normalizePhone(phone) ?? phone) : undefined,
        }
      : null,
  };
}

/**
 * A number typed into a NUMBER cell loses its leading 0 (MST 0309554620 →
 * 309554620, phone 0912345678 → 912345678). Both always start with 0 in
 * Vietnam, so a digits-only value one short of a known length gets it back.
 */
function restoreLeadingZero(value: string, shortLengths: number[]) {
  return /^\d+$/.test(value) && shortLengths.includes(value.length)
    ? `0${value}`
    : value;
}

/** A date typed as a real Excel date arrives as its serial (45853). */
function excelDate(value: string) {
  if (!/^\d{5}(?:\.\d+)?$/.test(value)) return value;
  const d = new Date(Date.UTC(1899, 11, 30) + Number(value) * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/**
 * Local 10-digit mobile: "+84 912-345-678" → "0912345678"; anything else
 * (a landline) → null and the caller keeps it as typed. Port of
 * crm-api-nest `common/phone.ts` normalizePhone.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const local =
    digits.startsWith("84") && digits.length === 11
      ? `0${digits.slice(2)}`
      : digits;
  return /^0\d{9}$/.test(local) ? local : null;
}

// ── Priced tables ─────────────────────────────────────────────────────────

type Columns = Partial<Record<PriceColumn, (header: string) => boolean>>;

// Matched against the folded header text; per column, the FIRST header cell
// that matches wins, so specific headers are listed before generic ones.
const QUOTE_COLUMNS: Columns = {
  [PriceColumn.STT]: (h) => h === "stt",
  [PriceColumn.DESC]: (h) => h.startsWith("noi dung") || h.startsWith("mo ta"),
  [PriceColumn.UNIT]: (h) => h === "dvt",
  [PriceColumn.QTY]: (h) => h.startsWith("khoi luong"),
  [PriceColumn.PRICE]: (h) => h.startsWith("don gia"),
  [PriceColumn.AMOUNT]: (h) => h.startsWith("thanh tien"),
};
const ACCEPTANCE_COLUMNS: Columns = {
  ...QUOTE_COLUMNS,
  [PriceColumn.QTY]: (h) => h.startsWith("khoi luong nghiem thu"),
};
const SETTLEMENT_COLUMNS: Columns = {
  ...QUOTE_COLUMNS,
  [PriceColumn.QTY]: (h) => h.startsWith("khoi luong thuc te"),
  [PriceColumn.AMOUNT]: (h) => h.startsWith("thanh tien thuc te"),
};

const ROMAN = /^[IVXLC]+\.?$/;

/**
 * "12,5" | "1.000.000" | "85,000" | 1000000 → number; blank → undefined;
 * junk → NaN. A run of 3-digit groups behind "." or "," is thousands
 * grouping (VN and Excel-English styles); anything else is a decimal.
 */
function toNumber(v: CellValue | undefined): number | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "number") return v;
  const s = v.replace(/\s/g, "");
  if (!s) return undefined;
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(s))
    return Number(s.replace(/\./g, "").replace(",", "."));
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(s))
    return Number(s.replace(/,/g, ""));
  return /^\d+(?:[.,]\d+)?$/.test(s) ? Number(s.replace(",", ".")) : NaN;
}

type Money = ParsedMoney & { errors: string[]; warnings: string[] };

const money = ({ items, vat_rate, discount_amount }: Money): ParsedMoney => ({
  items,
  vat_rate,
  discount_amount,
});

/**
 * Header row ("STT" …) → line rows → the totals block that starts at the
 * first "Tổng …" row (Giảm giá, Thuế VAT x%).
 *
 * `quantityOnly`: the nghiệm thu sheet has no prices — a line just needs its
 * khối lượng there.
 */
function readMoney(
  rows: SheetRow[],
  spec: Columns,
  where: string,
  { quantityOnly = false } = {}
): Money {
  const errors: string[] = [];
  const warnings: string[] = [];
  const result = (items: ParsedItem[], vat_rate = 0.08, discount_amount = 0) =>
    ({ items, vat_rate, discount_amount, errors, warnings }) satisfies Money;

  const headerAt = rows.findIndex((r) =>
    [...r.cells.values()].some((v) => fold(text(v)) === "stt")
  );
  if (headerAt < 0) {
    if (rows.length) errors.push(`${where}: không thấy dòng tiêu đề "STT".`);
    return result([]);
  }
  const cols: Partial<Record<PriceColumn, string>> = {};
  for (const [col, value] of rows[headerAt]!.cells) {
    const header = fold(text(value)).replace(/\s+/g, " ").trim();
    const key = Object.values(PriceColumn).find(
      (k) => spec[k] && !cols[k] && spec[k](header)
    );
    if (key) cols[key] = col;
  }
  const missing = [
    PriceColumn.DESC,
    PriceColumn.QTY,
    ...(quantityOnly ? [] : [PriceColumn.PRICE]),
  ].filter((k) => !cols[k]);
  if (missing.length) {
    errors.push(`${where}: thiếu cột ${missing.join(", ")} ở dòng tiêu đề.`);
    return result([]);
  }

  const get = (row: SheetRow, key: PriceColumn) =>
    cols[key] ? row.cells.get(cols[key]!) : undefined;
  // "Tổng cộng trước thuế" (báo giá, quyết toán) / "Tổng % trung bình"
  // (nghiệm thu) — not a bare "Tổng", which a line ("Tổng vệ sinh") may start with.
  const isTotal = (row: SheetRow) =>
    [...row.cells.values()].some((v) =>
      /^\s*tong (?:cong|%)/.test(fold(text(v)))
    );

  const items: ParsedItem[] = [];
  let category: string | undefined;
  let at = headerAt + 1;
  for (; at < rows.length && !isTotal(rows[at]!); at++) {
    const row = rows[at]!;
    const stt = text(get(row, PriceColumn.STT));
    const description = filled(text(get(row, PriceColumn.DESC)));
    if (!description) continue;
    if (ROMAN.test(stt)) {
      category = `${stt.replace(/\.$/, "")}. ${description}`;
      continue;
    }
    const quantity = toNumber(get(row, PriceColumn.QTY));
    const unitPrice = quantityOnly ? 0 : toNumber(get(row, PriceColumn.PRICE));
    const line = `${where} dòng ${row.row}`;
    if (Number.isNaN(quantity) || Number.isNaN(unitPrice)) {
      errors.push(`${line}: khối lượng / đơn giá không phải là số.`);
      continue;
    }
    // Template leftovers: a line nobody priced or measured is not part of the job.
    if (!(quantity ?? 0) && !(unitPrice ?? 0)) continue;
    if (quantity === undefined || unitPrice === undefined) {
      errors.push(
        `${line}: "${description}" thiếu ${quantity === undefined ? "khối lượng" : "đơn giá"}.`
      );
      continue;
    }
    if (quantity < 0 || unitPrice < 0) {
      errors.push(`${line}: số âm.`);
      continue;
    }
    items.push({
      ...(category && { category }),
      description,
      ...(text(get(row, PriceColumn.UNIT)) && {
        unit: text(get(row, PriceColumn.UNIT)),
      }),
      quantity,
      unit_price: Math.round(unitPrice),
    });
  }
  if (quantityOnly) return result(items);

  // Totals block, up to "Tổng cộng sau thuế" — the terms below it are free
  // text ("Giảm giá thêm nếu …") and must not count. First match wins. A
  // row's figure is its amount-column value, else its last number.
  let vatRate: number | undefined;
  let discount: number | undefined;
  let sheetSubtotal: number | undefined;
  for (const row of rows.slice(at)) {
    const label = fold(
      [...row.cells.values()].map(text).find((t) => /\p{L}/u.test(t)) ?? ""
    ).trim();
    const numbers = [...row.cells.values()].filter(
      (v): v is number => typeof v === "number"
    );
    const amount = toNumber(get(row, PriceColumn.AMOUNT));
    const figure =
      amount !== undefined && !Number.isNaN(amount) ? amount : numbers.at(-1);
    if (label.startsWith("tong cong sau thue")) break;
    if (label.startsWith("giam gia")) discount ??= Math.round(figure ?? 0);
    else if (label.startsWith("thue") && label.includes("vat")) {
      const pct = /(\d+(?:[.,]\d+)?)\s*%/.exec(label)?.[1];
      if (pct) vatRate ??= Number(pct.replace(",", ".")) / 100;
    } else if (
      label.startsWith("tong cong truoc thue") &&
      !label.includes("giam gia") &&
      sheetSubtotal === undefined
    )
      sheetSubtotal = figure;
  }

  const subtotal = items.reduce(
    (sum, it) => sum + Math.round(it.quantity * it.unit_price),
    0
  );
  if (vatRate === undefined) {
    vatRate = 0.08;
    warnings.push(`${where}: không thấy dòng "Thuế VAT …%" — dùng 8%.`);
  }
  discount ??= 0;
  if (discount < 0) errors.push(`${where}: giảm giá âm.`);
  if (discount > subtotal)
    errors.push(`${where}: giảm giá lớn hơn tổng trước thuế.`);
  // The file's own total is a formula over a fixed range (the template sums
  // F21:F39 — rows added below it are left out). Say so rather than guess.
  if (sheetSubtotal !== undefined && Math.round(sheetSubtotal) !== subtotal)
    warnings.push(
      `${where}: tổng trước thuế trong file (${Math.round(sheetSubtotal).toLocaleString("vi-VN")}) khác tổng tính lại từ các dòng (${subtotal.toLocaleString("vi-VN")}) — kiểm tra công thức trong file.`
    );
  return result(items, vatRate, discount);
}
