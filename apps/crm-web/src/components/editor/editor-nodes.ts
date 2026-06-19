/**
 * The single node registry shared by every Lexical surface in crm-web — the
 * editor (initialConfig.nodes) and any headless/import use. Keeping one list
 * guarantees stored JSON deserialises everywhere (incl. MergeFieldNode).
 */
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import type { Klass, LexicalNode } from "lexical";

import { LineItemsNode } from "./line-items-node";
import { MergeFieldNode } from "./merge-field-node";

export const editorNodes: ReadonlyArray<Klass<LexicalNode>> = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  // Tables — needed so Word tables survive .docx import (and render/export).
  TableNode,
  TableRowNode,
  TableCellNode,
  // Merge constructs
  MergeFieldNode,
  LineItemsNode,
];
