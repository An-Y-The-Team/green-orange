/**
 * Helpers for building and inspecting Lexical editorState JSON without a running
 * editor. A contract template / contract `body` is stored as the string form of
 * `editorState.toJSON()` (shape: `{ "root": { … } }`).
 *
 * These builders produce exactly that shape, so mock data (data/mock/*) can be
 * authored readably in code instead of pasting verbose raw JSON, and the output
 * deserialises cleanly both into the live editor (initialConfig.editorState) and
 * into the pure-React renderer (components/editor/lexical-document.tsx).
 *
 * Pure module — no React, no DOM, no Lexical runtime — so it is safe on the
 * server (schema validation, the print page) and the client (mock data, editor).
 */
import { CONTRACT_TOKENS } from "@/lib/merge-template";

/** Lexical TextNode format bit-flags (subset we expose in the toolbar). */
export const TEXT_FORMAT = {
  bold: 1,
  italic: 2,
  strikethrough: 4,
  underline: 8,
  code: 16,
} as const;

export type LexNode = {
  type: string;
  version: number;
  children?: LexNode[];
  text?: string;
  token?: string;
  tag?: string;
  format?: number | string;
  [key: string]: unknown;
};

const block = (
  type: string,
  children: LexNode[],
  extra: Record<string, unknown> = {}
): LexNode => ({
  type,
  version: 1,
  direction: "ltr",
  format: "",
  indent: 0,
  children,
  ...extra,
});

/** Plain text run, optionally with format bit-flags from {@link TEXT_FORMAT}. */
export const t = (text: string, format = 0): LexNode => ({
  type: "text",
  version: 1,
  detail: 0,
  format,
  mode: "normal",
  style: "",
  text,
});

/** A merge-field chip for `token` (label looked up from the token catalog). */
export const mf = (token: string): LexNode => ({
  type: "merge-field",
  version: 1,
  detail: 0,
  format: 0,
  mode: "token",
  style: "",
  text: CONTRACT_TOKENS.find((x) => x.token === token)?.label ?? token,
  token,
});

export const p = (...children: LexNode[]): LexNode =>
  block("paragraph", children);
export const h2 = (...children: LexNode[]): LexNode =>
  block("heading", children, { tag: "h2" });
export const h3 = (...children: LexNode[]): LexNode =>
  block("heading", children, { tag: "h3" });
export const li = (...children: LexNode[]): LexNode =>
  block("listitem", children, { value: 1 });

const listOf =
  (listType: "bullet" | "number", tag: "ul" | "ol") =>
  (...items: LexNode[]): LexNode =>
    block(
      "list",
      items.map((it, i) => ({ ...it, value: i + 1 })),
      { listType, start: 1, tag }
    );

export const ul = listOf("bullet", "ul");
export const ol = listOf("number", "ol");

/** The auto báo giá block — expands to the linked quote's pricing at render. */
export const lineItems = (): LexNode => ({ type: "line-items", version: 1 });

/** Wrap top-level blocks into a serialised editorState string. */
export const doc = (...children: LexNode[]): string =>
  JSON.stringify({ root: block("root", children) });

/**
 * Flatten a stored body to its plain text (merge-field labels included). Used
 * for presence validation — an empty document serialises to a non-empty JSON
 * string, so length-of-JSON checks are meaningless; this checks real content.
 * Returns "" for anything that isn't parseable Lexical JSON.
 */
export function lexicalPlainText(body: string): string {
  try {
    const state = JSON.parse(body) as { root?: LexNode };
    const out: string[] = [];
    const walk = (n: LexNode | undefined) => {
      if (!n) return;
      if (typeof n.text === "string") out.push(n.text);
      n.children?.forEach(walk);
    };
    walk(state.root);
    return out.join("").trim();
  } catch {
    return "";
  }
}
