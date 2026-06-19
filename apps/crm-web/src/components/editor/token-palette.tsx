"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import { $getSelection, $insertNodes, $isRangeSelection } from "lexical";
import { Table } from "lucide-react";

import { Button } from "@yan/ui/components/button";

import { CONTRACT_TOKENS } from "@/lib/merge-template";

import { $createLineItemsNode } from "./line-items-node";
import { $createMergeFieldNode } from "./merge-field-node";

/**
 * Palette of merge tokens. Clicking inserts a MergeFieldNode at the caret. The
 * whitelist is CONTRACT_TOKENS, so only known tokens can ever be authored.
 */
export function TokenPalette() {
  const [editor] = useLexicalComposerContext();

  const insert = (token: string) =>
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      // Insert the chip followed by a space so the caret lands outside it.
      $insertNodes([$createMergeFieldNode(token)]);
    });

  const insertLineItems = () =>
    editor.update(() => {
      $insertNodeToNearestRoot($createLineItemsNode());
    });

  return (
    <div className="space-y-1.5 border-b bg-muted/40 px-2 py-1.5">
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          Chèn trường dữ liệu
        </p>
        <div className="flex flex-wrap gap-1">
          {CONTRACT_TOKENS.map((token) => (
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
    </div>
  );
}
