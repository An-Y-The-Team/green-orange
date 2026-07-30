"use client";

/**
 * LineItemsNode — a block-level placeholder for the contract's pricing table.
 * It carries NO data: at render time the document walker
 * (components/editor/lexical-document.tsx) expands it into the full báo giá
 * table from the linked Quote's items + VAT, so the numbers stay live and can
 * never drift from the quote. In the editor it shows a labelled, non-editable
 * box. Only inserted from the token palette.
 */
import {
  type DOMConversionMap,
  DecoratorNode,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
} from "lexical";
import type { JSX } from "react";

export type SerializedLineItemsNode = SerializedLexicalNode;

function LineItemsPlaceholder(): JSX.Element {
  return (
    <div className="my-2 rounded-md border border-dashed border-emerald-400 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-800">
      <span className="font-medium">Bảng báo giá (tự động)</span> — chèn từ báo
      giá liên kết khi in/xuất tài liệu.
    </div>
  );
}

export class LineItemsNode extends DecoratorNode<JSX.Element> {
  static getType(): string {
    return "line-items";
  }

  static clone(node: LineItemsNode): LineItemsNode {
    return new LineItemsNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM(): HTMLElement {
    const div = document.createElement("div");
    div.setAttribute("data-line-items", "true");
    return div;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): false {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return null;
  }

  static importJSON(): LineItemsNode {
    return $createLineItemsNode();
  }

  exportJSON(): SerializedLineItemsNode {
    return { type: "line-items", version: 1 };
  }

  decorate(): JSX.Element {
    return <LineItemsPlaceholder />;
  }
}

export function $createLineItemsNode(): LineItemsNode {
  return new LineItemsNode();
}

export function $isLineItemsNode(
  node: LexicalNode | null | undefined
): node is LineItemsNode {
  return node instanceof LineItemsNode;
}
