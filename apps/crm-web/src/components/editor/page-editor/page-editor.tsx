"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import {
  DocumentShell,
  SignatureBlocks,
} from "@/components/document-shell/document-shell";
import type { HeaderBlocks } from "@/constants/header-blocks";

import { DocxImportButton } from "../docx-import-button/docx-import-button";
import { EDITOR_NODES } from "../editor-nodes";
import { EDITOR_THEME } from "../editor-theme";
import { PaginationPlugin } from "../pagination-plugin/pagination-plugin";
import { TokenPalette } from "../token-palette/token-palette";
import { Toolbar } from "../toolbar/toolbar";

/**
 * Google-Docs-style document editor: you type directly on the A4 sheet —
 * letterhead, title and signature blocks around the caret — under a sticky
 * toolbar, with page breaks drawn as you write (PaginationPlugin).
 *
 * Emits the serialised editorState JSON via `onChange`; seeded once from
 * `value` (remount with a new `key` to reseed).
 */
export function PageEditor({
  value,
  onChange,
  title,
  subtitle,
  headerBlocks,
  resolve,
  toolbarExtra,
  status,
  footer,
}: {
  value?: string;
  onChange: (json: string) => void;
  title: ReactNode;
  subtitle?: string;
  headerBlocks?: HeaderBlocks;
  /** Resolves a merge token to its live value, so inserted chips read like the final document. */
  resolve?: (token: string) => string | undefined;
  /** Extra controls (e.g. template picker) shown in the sticky toolbar. */
  toolbarExtra?: ReactNode;
  /** Save-state indicator shown at the toolbar's right edge. */
  status?: ReactNode;
  /** Sheet footer under the body; defaults to the static signature blocks. */
  footer?: ReactNode;
}) {
  const initialConfig = {
    namespace: "contract-editor",
    theme: EDITOR_THEME,
    nodes: [...EDITOR_NODES],
    editorState: value && value.length > 0 ? value : undefined,
    onError(error: Error) {
      throw error;
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-md border bg-background/95 p-1.5 shadow-sm backdrop-blur print:hidden">
        <div className="flex items-center gap-0.5">
          <Toolbar />
        </div>
        <span className="h-5 w-px bg-border" />
        <details className="relative">
          <summary className="flex cursor-pointer select-none list-none items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-accent [&::-webkit-details-marker]:hidden">
            Chèn
            <ChevronDown className="size-3.5" />
          </summary>
          <div className="absolute left-0 top-full z-30 mt-1 w-[26rem] max-w-[80vw] rounded-md border bg-popover p-1 shadow-md">
            <TokenPalette resolve={resolve} />
          </div>
        </details>
        <DocxImportButton />
        {toolbarExtra}
        {status && <div className="ml-auto pr-1">{status}</div>}
      </div>

      <div className="mt-4 rounded-lg bg-muted px-2 py-8 sm:px-8">
        <DocumentShell
          title={title}
          subtitle={subtitle}
          headerBlocks={headerBlocks}
        >
          <div className="relative mt-3">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  aria-label="Nội dung tài liệu"
                  className="min-h-[8rem] text-xs leading-relaxed text-zinc-700 outline-none"
                />
              }
              placeholder={
                <div className="pointer-events-none absolute left-0 top-0 text-xs text-zinc-400">
                  Soạn nội dung tài liệu…
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>
          {footer ?? <SignatureBlocks />}
        </DocumentShell>
      </div>

      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin />
      <TablePlugin />
      <PaginationPlugin />
      <OnChangePlugin
        ignoreSelectionChange
        onChange={(editorState) =>
          onChange(JSON.stringify(editorState.toJSON()))
        }
      />
    </LexicalComposer>
  );
}
