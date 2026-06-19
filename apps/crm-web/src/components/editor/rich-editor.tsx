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

import { DocxImportButton } from "./docx-import-button";
import { editorNodes } from "./editor-nodes";
import { editorTheme } from "./editor-theme";
import { TokenPalette } from "./token-palette";
import { Toolbar } from "./toolbar";

/**
 * Shared rich-text editor for contract templates and contract bodies. Emits the
 * serialised editorState JSON via `onChange` (bound to a react-hook-form field).
 * Initialised once from `value`; not re-synced on prop change (that would reset
 * the caret) — RHF defaultValues seed it.
 */
export function RichEditor({
  value,
  onChange,
}: {
  value?: string;
  onChange: (json: string) => void;
}) {
  const initialConfig = {
    namespace: "contract-editor",
    theme: editorTheme,
    nodes: [...editorNodes],
    editorState: value && value.length > 0 ? value : undefined,
    onError(error: Error) {
      throw error;
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="rounded-md border">
        <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
          <Toolbar />
          <span className="mx-1 h-5 w-px bg-border" />
          <DocxImportButton />
        </div>
        <TokenPalette />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                aria-label="Nội dung tài liệu"
                className="min-h-[24rem] px-3 py-2 text-xs leading-relaxed outline-none"
              />
            }
            placeholder={
              <div className="pointer-events-none absolute left-3 top-2 text-xs text-muted-foreground">
                Soạn nội dung tài liệu…
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
      </div>
      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin />
      <TablePlugin />
      <OnChangePlugin
        ignoreSelectionChange
        onChange={(editorState) =>
          onChange(JSON.stringify(editorState.toJSON()))
        }
      />
    </LexicalComposer>
  );
}
