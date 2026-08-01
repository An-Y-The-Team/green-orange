/**
 * Renders a stored Lexical `body` (the string form of editorState.toJSON()) to
 * the A4 document — resolving merge-field nodes against a {@link MergeContext}
 * and expanding the line-items block into the linked quote's pricing table.
 *
 * This is the single render path used by BOTH:
 *   • the print page ([id]/page.tsx) — a Server Component, ctx = real contract;
 *   • the editor's live preview — a Client Component, ctx = previewContext().
 *
 * It is a plain pure-React walker (no Lexical runtime, no DOM), so it runs in an
 * RSC and prints without client hydration. Text is emitted as escaped React
 * children (never dangerouslySetInnerHTML), so an author cannot inject markup.
 */
import { Fragment, type ReactNode } from "react";

import { LINE_ITEM_COLUMNS } from "@/constants/labels";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import {
  type LexNode,
  TEXT_FORMAT,
  lexicalRoot,
} from "@/utils/lexical-build/lexical-build";
import {
  type MergeContext,
  unresolvedMarker,
} from "@/utils/merge-template/merge-template";
import { itemAmount, quoteTotals } from "@/utils/quote-totals/quote-totals";
import { vndInWords } from "@/utils/vnd-in-words/vnd-in-words";

/**
 * Structured pricing for the line-items block (from the linked Quote). Only
 * the display fields — a real QuoteItem fits, and so do editor sample rows.
 * `amount` is the server's per-line figure; absent on editor sample rows.
 */
export type LineItemsData = {
  items: {
    description: string;
    unit?: string | null;
    quantity: number;
    unit_price: number;
    amount?: number;
  }[];
  vatRate: number;
};

/** Block alignment (Lexical element `format` string) → Tailwind class. */
const ALIGN: Record<string, string> = {
  center: "text-center",
  right: "text-right",
  end: "text-right",
  justify: "text-justify",
};
const alignCls = (node: LexNode): string =>
  typeof node.format === "string" ? (ALIGN[node.format] ?? "") : "";

function inlineText(node: LexNode, ctx: MergeContext, key: number): ReactNode {
  let content: ReactNode;
  if (node.type === "merge-field") {
    const token = node.token ?? "";
    if (token in ctx) {
      content = ctx[token];
    } else {
      // Styled as a loud error, not as content: this is a token nothing can
      // resolve, and the same renderer draws the printable contract. Saving a
      // template with one is refused (contracts/actions/save-template.ts), so
      // this only shows for bodies stored before that check existed.
      content = (
        <span
          className="rounded border border-red-400 bg-red-100 px-1 font-semibold text-red-700 print:border-red-600"
          title={`Trường trộn không tồn tại: ${token}. Sửa mẫu hợp đồng trước khi in.`}
        >
          {unresolvedMarker(token)}
        </span>
      );
    }
  } else {
    content = node.text ?? "";
  }

  const f = typeof node.format === "number" ? node.format : 0;
  if (f & TEXT_FORMAT.code) {
    content = (
      <code className="rounded bg-zinc-100 px-1 text-[0.95em]">{content}</code>
    );
  }
  const cls = [
    f & TEXT_FORMAT.bold && "font-semibold",
    f & TEXT_FORMAT.italic && "italic",
    f & TEXT_FORMAT.underline && "underline",
    f & TEXT_FORMAT.strikethrough && "line-through",
  ]
    .filter(Boolean)
    .join(" ");

  return cls ? (
    <span key={key} className={cls}>
      {content}
    </span>
  ) : (
    <Fragment key={key}>{content}</Fragment>
  );
}

function inline(children: LexNode[] | undefined, ctx: MergeContext): ReactNode {
  if (!children) return null;
  return children.map((child, i) => {
    if (child.type === "linebreak") return <br key={i} />;
    if (child.type === "link") {
      return (
        <a
          key={i}
          href={typeof child.url === "string" ? child.url : undefined}
          className="text-emerald-700 underline"
        >
          {inline(child.children, ctx)}
        </a>
      );
    }
    return inlineText(child, ctx, i);
  });
}

/** The auto báo giá table — rendered from the linked quote's items + VAT. */
function LineItemsTable({ data }: { data: LineItemsData | null | undefined }) {
  if (!data || data.items.length === 0) {
    return (
      <p className="my-2 rounded border border-dashed border-zinc-300 px-3 py-2 text-xs italic text-zinc-400">
        (Bảng báo giá — chưa có báo giá liên kết)
      </p>
    );
  }
  const { subtotal, vat, total } = quoteTotals(data.items, data.vatRate);

  return (
    <div className="my-3 break-inside-avoid">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-y border-zinc-300 bg-zinc-50 text-left">
            <th className="w-8 px-2 py-1.5">{LINE_ITEM_COLUMNS.index}</th>
            <th className="px-2 py-1.5">{LINE_ITEM_COLUMNS.descriptionLong}</th>
            <th className="px-2 py-1.5 text-center">
              {LINE_ITEM_COLUMNS.unit}
            </th>
            <th className="px-2 py-1.5 text-right">
              {LINE_ITEM_COLUMNS.quantity}
            </th>
            <th className="px-2 py-1.5 text-right">
              {LINE_ITEM_COLUMNS.unitPrice}
            </th>
            <th className="px-2 py-1.5 text-right">
              {LINE_ITEM_COLUMNS.total}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, i) => (
            <tr key={i} className="border-b border-zinc-200">
              <td className="px-2 py-1.5">{i + 1}</td>
              <td className="px-2 py-1.5">{item.description}</td>
              <td className="px-2 py-1.5 text-center">{item.unit}</td>
              <td className="px-2 py-1.5 text-right">{item.quantity}</td>
              <td className="px-2 py-1.5 text-right">
                {formatVND(item.unit_price)}
              </td>
              <td className="px-2 py-1.5 text-right">
                {formatVND(itemAmount(item))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto mt-2 w-64 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-zinc-500">Tổng cộng trước thuế</span>
          <span>{formatVND(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">
            Thuế VAT ({Math.round(data.vatRate * 100)}%)
          </span>
          <span>{formatVND(vat)}</span>
        </div>
        <div className="flex justify-between border-t border-zinc-300 pt-1 text-sm font-bold">
          <span>Tổng cộng sau thuế</span>
          <span>{formatVND(total)}</span>
        </div>
      </div>
      <p className="mt-1 text-xs italic text-zinc-600">
        Bằng chữ: {vndInWords(total)}.
      </p>
    </div>
  );
}

/** Generic (imported / manual) table → HTML table. */
function GenericTable({
  node,
  ctx,
  lineItems,
  key,
}: {
  node: LexNode;
  ctx: MergeContext;
  lineItems: LineItemsData | null | undefined;
  key: number;
}) {
  return (
    <table
      key={key}
      className="my-3 w-full break-inside-avoid border-collapse text-xs [&_td]:border [&_td]:border-zinc-300 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-zinc-300 [&_th]:bg-zinc-50 [&_th]:px-2 [&_th]:py-1"
    >
      <tbody>
        {(node.children ?? []).map((row, ri) => (
          <tr key={ri}>
            {(row.children ?? []).map((cell, ci) => {
              const headerState =
                typeof cell.headerState === "number" ? cell.headerState : 0;
              const colSpan =
                typeof cell.colSpan === "number" ? cell.colSpan : undefined;
              const rowSpan =
                typeof cell.rowSpan === "number" ? cell.rowSpan : undefined;
              const content = (cell.children ?? []).map((c, i) =>
                block(c, ctx, lineItems, i)
              );
              return headerState > 0 ? (
                <th key={ci} colSpan={colSpan} rowSpan={rowSpan}>
                  {content}
                </th>
              ) : (
                <td key={ci} colSpan={colSpan} rowSpan={rowSpan}>
                  {content}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function block(
  node: LexNode,
  ctx: MergeContext,
  lineItems: LineItemsData | null | undefined,
  key: number
): ReactNode {
  switch (node.type) {
    case "line-items":
      return <LineItemsTable key={key} data={lineItems} />;
    case "table":
      return (
        <GenericTable node={node} ctx={ctx} lineItems={lineItems} key={key} />
      );
    case "heading": {
      const cls = [
        node.tag === "h3"
          ? "pt-1 text-xs font-semibold text-zinc-900"
          : "pt-1 text-xs font-semibold uppercase text-zinc-900",
        alignCls(node),
      ]
        .filter(Boolean)
        .join(" ");
      return node.tag === "h3" ? (
        <h3 key={key} className={cls}>
          {inline(node.children, ctx)}
        </h3>
      ) : (
        <h2 key={key} className={cls}>
          {inline(node.children, ctx)}
        </h2>
      );
    }
    case "list": {
      const items = (node.children ?? []).map((item, i) => (
        <li key={i}>
          {/* A list item may nest a child list, or hold inline content. */}
          {(item.children ?? []).some((c) => c.type === "list")
            ? (item.children ?? []).map((c, j) =>
                c.type === "list" ? (
                  block(c, ctx, lineItems, j)
                ) : (
                  <Fragment key={j}>{inlineText(c, ctx, j)}</Fragment>
                )
              )
            : inline(item.children, ctx)}
        </li>
      ));
      return node.tag === "ol" ? (
        <ol key={key} className="list-decimal space-y-0.5 pl-5">
          {items}
        </ol>
      ) : (
        <ul key={key} className="list-disc space-y-0.5 pl-5">
          {items}
        </ul>
      );
    }
    case "quote":
      return (
        <blockquote
          key={key}
          className={`border-l-2 border-zinc-300 pl-3 italic text-zinc-600 ${alignCls(node)}`}
        >
          {inline(node.children, ctx)}
        </blockquote>
      );
    case "paragraph":
    default: {
      const kids = inline(node.children, ctx);
      // Preserve empty paragraphs as spacing, like a blank line.
      return (
        <p key={key} className={alignCls(node) || undefined}>
          {node.children?.length ? kids : <br />}
        </p>
      );
    }
  }
}

export function LexicalDocument({
  body,
  ctx,
  lineItems,
  className = "mt-3 space-y-3 text-xs leading-relaxed text-zinc-700",
}: {
  body: string;
  ctx: MergeContext;
  /** Pricing for the line-items block; null/undefined → placeholder note. */
  lineItems?: LineItemsData | null;
  /** Wrapper classes — override for non-body uses (e.g. the page header). */
  className?: string;
}) {
  const root = lexicalRoot(body);

  if (!root?.children?.length) {
    return (
      <p className="mt-3 text-xs italic text-zinc-400">(Chưa có nội dung)</p>
    );
  }

  return (
    <div className={className}>
      {root.children.map((node, i) => block(node, ctx, lineItems, i))}
    </div>
  );
}
