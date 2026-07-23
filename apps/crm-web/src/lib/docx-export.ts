/**
 * Export a stored Lexical `body` to a downloadable .docx file.
 *
 * `docx` is heavy and only needed on an explicit export click, so it is
 * **dynamically imported** — it never enters the route's initial JS bundle.
 * Runs client-side; the document never leaves the browser.
 *
 * `ctx`:
 *   • a MergeContext → resolve merge fields to real values (a finished contract);
 *   • null           → emit literal `{{token}}` text (a reusable template).
 *
 * Fidelity is "good-enough structured" by design — headings, paragraphs, lists,
 * and bold/italic/underline marks; complex Word layouts won't round-trip.
 */
import type { LineItemsData } from "@/components/editor/lexical-document";
import { formatVND, quoteTotals } from "@/lib/format";
import { type LexNode, TEXT_FORMAT } from "@/lib/lexical-build";
import type { MergeContext } from "@/lib/merge-template";
import { vndInWords } from "@/lib/vnd-in-words";

export async function exportDocx({
  body,
  ctx,
  lineItems,
  title,
  fileName,
}: {
  body: string;
  ctx: MergeContext | null;
  lineItems?: LineItemsData | null;
  title: string;
  fileName: string;
}): Promise<void> {
  const {
    AlignmentType,
    Document,
    HeadingLevel,
    LevelFormat,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = await import("docx");

  const tokenText = (node: LexNode): string => {
    const token = node.token ?? "";
    if (ctx) return token in ctx ? ctx[token] : `⟨${token}?⟩`;
    return `{{${token}}}`;
  };

  const textRun = (node: LexNode) => {
    const text =
      node.type === "merge-field" ? tokenText(node) : (node.text ?? "");
    const f = typeof node.format === "number" ? node.format : 0;
    return new TextRun({
      text,
      bold: Boolean(f & TEXT_FORMAT.bold),
      italics: Boolean(f & TEXT_FORMAT.italic),
      underline: f & TEXT_FORMAT.underline ? {} : undefined,
      strike: Boolean(f & TEXT_FORMAT.strikethrough),
    });
  };

  const runsFrom = (children: LexNode[] | undefined) => {
    if (!children) return [];
    return children.flatMap((c) => {
      if (c.type === "linebreak") return [new TextRun({ text: "", break: 1 })];
      if (c.type === "link") return (c.children ?? []).map(textRun);
      return [textRun(c)];
    });
  };

  // Plain helper: a table cell holding a single text paragraph.
  const textCell = (text: string, bold = false) =>
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text, bold })] })],
    });

  // The auto báo giá table → a docx Table + totals + amount-in-words.
  const lineItemsBlocks = (data: LineItemsData) => {
    const { subtotal, vat, total } = quoteTotals(data.items, data.vatRate);
    const header = new TableRow({
      tableHeader: true,
      children: [
        "STT",
        "Nội dung công việc",
        "ĐVT",
        "Khối lượng",
        "Đơn giá",
        "Thành tiền",
      ].map((h) => textCell(h, true)),
    });
    const rows = data.items.map(
      (item, i) =>
        new TableRow({
          children: [
            textCell(String(i + 1)),
            textCell(item.description),
            textCell(item.unit ?? ""),
            textCell(String(item.quantity)),
            textCell(formatVND(item.unit_price)),
            textCell(formatVND(item.quantity * item.unit_price)),
          ],
        })
    );
    return [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [header, ...rows],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Tổng cộng trước thuế: ${formatVND(subtotal)} · Thuế VAT (${Math.round(data.vatRate * 100)}%): ${formatVND(vat)} · Tổng cộng sau thuế: ${formatVND(total)}`,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Bằng chữ: ${vndInWords(total)}.`,
            italics: true,
          }),
        ],
      }),
    ];
  };

  // A generic (imported / manual) table → a docx Table.
  const genericTable = (node: LexNode) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: (node.children ?? []).map(
        (row) =>
          new TableRow({
            children: (row.children ?? []).map((cell) => {
              const kids = (cell.children ?? []).flatMap(blocksFrom);
              return new TableCell({
                children: kids.length ? kids : [new Paragraph({})],
              });
            }),
          })
      ),
    });

  const blocksFrom = (
    node: LexNode
  ): (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] => {
    switch (node.type) {
      case "line-items":
        return lineItems ? lineItemsBlocks(lineItems) : [];
      case "table":
        return [genericTable(node)];
      case "heading":
        return [
          new Paragraph({
            heading:
              node.tag === "h3"
                ? HeadingLevel.HEADING_3
                : HeadingLevel.HEADING_2,
            children: runsFrom(node.children),
          }),
        ];
      case "list": {
        const ordered = node.tag === "ol";
        return (node.children ?? []).map(
          (item) =>
            new Paragraph({
              children: runsFrom(item.children),
              ...(ordered
                ? { numbering: { reference: "ol", level: 0 } }
                : { bullet: { level: 0 } }),
            })
        );
      }
      case "quote":
        return [
          new Paragraph({
            children: runsFrom(node.children),
            indent: { left: 360 },
          }),
        ];
      case "paragraph":
      default:
        return [new Paragraph({ children: runsFrom(node.children) })];
    }
  };

  let root: LexNode | undefined;
  try {
    root = (JSON.parse(body) as { root?: LexNode }).root;
  } catch {
    root = undefined;
  }

  const bodyParagraphs = (root?.children ?? []).flatMap(blocksFrom);

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "ol",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    sections: [
      {
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          ...bodyParagraphs,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName.endsWith(".docx") ? fileName : `${fileName}.docx`;
  anchor.click();
  URL.revokeObjectURL(url);
}
