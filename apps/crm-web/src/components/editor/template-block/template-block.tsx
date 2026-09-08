"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ChevronDown } from "lucide-react";

import type { MergeContext } from "@/utils/merge-template/merge-template";

import { EDITOR_NODES } from "../editor-nodes";
import { EDITOR_THEME } from "../editor-theme";
import {
  type PaletteToken,
  TokenPalette,
} from "../token-palette/token-palette";
import { Toolbar } from "../toolbar/toolbar";

/**
 * A small standalone rich-text template: its own toolbar, its own "Chèn" menu of
 * merge chips, its own content area. Used for the header templates on the
 * company-profile page (letterhead, Quốc hiệu), where several independent
 * templates live on one page — unlike PageEditor, which owns a whole A4 sheet.
 *
 * Chips render the live value while editing but stay tokens in storage, so the
 * template always follows the fields it is populated from.
 */
export function TemplateBlock({
  label,
  hint,
  value,
  onChange,
  tokens,
  ctx,
  readOnly,
}: {
  label: string;
  hint?: string;
  /** Seed body; this component is uncontrolled after mount (remount to reseed). */
  value: string;
  onChange: (json: string) => void;
  tokens: PaletteToken[];
  /** Resolves chips to live values for display. */
  ctx: MergeContext;
  /**
   * Frozen document: no toolbar, no chip menu, caret only. A `contentEditable`
   * ignores a surrounding `<fieldset disabled>`, so a read-only host page has
   * to say so here or the text stays typeable.
   */
  readOnly?: boolean;
}) {
  const initialConfig = {
    namespace: `template-block-${label}`,
    theme: EDITOR_THEME,
    nodes: [...EDITOR_NODES],
    editable: !readOnly,
    editorState: value && value.length > 0 ? value : undefined,
    onError(error: Error) {
      throw error;
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <section className="space-y-1.5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>

        {readOnly ? null : (
          <div className="flex flex-wrap items-center gap-1 rounded-md border bg-muted/40 p-1">
            <Toolbar />
            <span className="mx-1 h-5 w-px bg-border" />
            <details className="relative">
              <summary className="flex cursor-pointer select-none list-none items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-accent [&::-webkit-details-marker]:hidden">
                Chèn
                <ChevronDown className="size-3.5" />
              </summary>
              <div className="absolute left-0 top-full z-30 mt-1 w-[26rem] max-w-[80vw] rounded-md border bg-popover p-1 shadow-md">
                <TokenPalette
                  tokens={tokens}
                  showLineItems={false}
                  resolve={(token) => ctx[token]}
                />
              </div>
            </details>
          </div>
        )}

        <div className="relative rounded-md border border-dashed border-zinc-300 bg-white p-3">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                aria-label={label}
                className="min-h-[4.5rem] rounded-sm text-xs leading-relaxed text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
              />
            }
            placeholder={
              <div className="pointer-events-none absolute left-3 top-3 text-xs text-zinc-500">
                Soạn nội dung…
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
      </section>

      <HistoryPlugin />
      {/* The toolbar offers bullet/numbered lists; without this the commands it
          dispatches are unhandled and nothing happens. */}
      <ListPlugin />
      <OnChangePlugin
        ignoreSelectionChange
        onChange={(editorState) =>
          onChange(JSON.stringify(editorState.toJSON()))
        }
      />
    </LexicalComposer>
  );
}
