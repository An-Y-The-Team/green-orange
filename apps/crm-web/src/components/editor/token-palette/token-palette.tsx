"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import { $getSelection, $insertNodes, $isRangeSelection } from "lexical";
import { Table } from "lucide-react";

import { Button } from "@yan/ui/components/button";

import { CONTRACT_TOKENS } from "@/utils/merge-template/merge-template";

import { $createLineItemsNode } from "../line-items-node/line-items-node";
import { $createMergeFieldNode } from "../merge-field-node";

/**
 * Palette of merge tokens. Clicking inserts a MergeFieldNode at the caret. The
 * whitelist is CONTRACT_TOKENS, so only known tokens can ever be authored.
 */
export function TokenPalette({
  resolve,
  tokens = CONTRACT_TOKENS,
  showLineItems = true,
}: {
  /** When given, a fresh chip shows the token's live value instead of its label. */
  resolve?: (token: string) => string | undefined;
  /** Subset of CONTRACT_TOKENS to offer (e.g. only company.* in the header editor). */
  tokens?: typeof CONTRACT_TOKENS;
  /** Whether the "Chèn bảng báo giá" block button is offered. */
  showLineItems?: boolean;
}) {
  const [editor] = useLexicalComposerContext();

  const insert = (token: string) =>
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      // Insert the chip followed by a space so the caret lands outside it.
      const node = $createMergeFieldNode(token);
      const value = resolve?.(token);
      if (value) node.setTextContent(value);
      $insertNodes([node]);
    });

  const insertLineItems = () =>
    editor.update(() => {
      $insertNodeToNearestRoot($createLineItemsNode());
    });

  return (
    <div className="space-y-1.5 px-2 py-1.5">
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          Chèn trường dữ liệu
        </p>
        <div className="flex flex-wrap gap-1">
          {tokens.map((token) => (
            <Button
              key={token.token}
              type="button"
              variant="outline"
              size="xs"
              title={`{{${token.token}}}`}
              onClick={() => insert(token.token)}
            >
              {token.label}
            </Button>
          ))}
        </div>
      </div>
      {showLineItems && (
        <div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={insertLineItems}
          >
            <Table />
            Chèn bảng báo giá
          </Button>
        </div>
      )}
    </div>
  );
}
