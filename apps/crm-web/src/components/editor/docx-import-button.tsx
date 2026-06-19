"use client";

import { $generateNodesFromDOM } from "@lexical/html";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createParagraphNode, $getRoot, $insertNodes } from "lexical";
import { FileUp } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@yan/ui/components/button";

import { docxToHtml } from "@/lib/docx-import";

/** "Nhập .docx": replace the editor content with an imported Word draft. */
export function DocxImportButton() {
  const [editor] = useLexicalComposerContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-importing the same file
    if (!file) return;
    setBusy(true);
    try {
      const html = await docxToHtml(await file.arrayBuffer());
      const dom = new DOMParser().parseFromString(html, "text/html");
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        root.select();
        $insertNodes($generateNodesFromDOM(editor, dom));
        if (root.getChildrenSize() === 0) root.append($createParagraphNode());
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".docx"
        hidden
        onChange={(e) => void handleFile(e)}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <FileUp />
        {busy ? "Đang nhập…" : "Nhập .docx"}
      </Button>
    </>
  );
}
