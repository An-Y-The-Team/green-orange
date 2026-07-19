/**
 * MergeFieldNode — a contract merge token (e.g. `client`) as a first-class
 * editor node. Implemented as a TextNode subclass in "token" mode so it behaves
 * as one atomic, non-editable chip (the canonical mention-style pattern) and
 * serialises trivially to JSON.
 *
 * Only created from the whitelisted token palette, so unknown tokens cannot be
 * authored — preserving the safety the old regex engine had. At render time the
 * chip is resolved to its value by components/editor/lexical-document.tsx.
 */
import {
  $applyNodeReplacement,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
  TextNode,
} from "lexical";

import { CONTRACT_TOKENS } from "@/lib/merge-template";

export type SerializedMergeFieldNode = Spread<
  { token: string },
  SerializedTextNode
>;

const labelFor = (token: string): string =>
  CONTRACT_TOKENS.find((t) => t.token === token)?.label ?? token;

export class MergeFieldNode extends TextNode {
  __token: string;

  static getType(): string {
    return "merge-field";
  }

  static clone(node: MergeFieldNode): MergeFieldNode {
    return new MergeFieldNode(node.__token, node.__text, node.__key);
  }

  constructor(token: string, text?: string, key?: NodeKey) {
    super(text ?? labelFor(token), key);
    this.__token = token;
  }

  getToken(): string {
    return this.getLatest().__token;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.className =
      "mx-0.5 inline-block rounded bg-emerald-100 px-1 align-baseline text-[0.95em] font-medium text-emerald-800";
    dom.setAttribute("data-merge-token", this.__token);
    return dom;
  }

  static importJSON(serialized: SerializedMergeFieldNode): MergeFieldNode {
    const node = $createMergeFieldNode(serialized.token);
    node.setTextContent(serialized.text);
    node.setFormat(serialized.format);
    node.setDetail(serialized.detail);
    node.setMode(serialized.mode);
    node.setStyle(serialized.style);
    return node;
  }

  exportJSON(): SerializedMergeFieldNode {
    return {
      ...super.exportJSON(),
      token: this.__token,
      type: "merge-field",
      version: 1,
    };
  }
}

export function $createMergeFieldNode(token: string): MergeFieldNode {
  const node = new MergeFieldNode(token);
  node.setMode("token");
  return $applyNodeReplacement(node);
}

export function $isMergeFieldNode(
  node: LexicalNode | null | undefined
): node is MergeFieldNode {
  return node instanceof MergeFieldNode;
}
