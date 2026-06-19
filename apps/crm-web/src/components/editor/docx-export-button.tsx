"use client";

import { FileDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@yan/ui/components/button";

import type { LineItemsData } from "@/components/editor/lexical-document";
import { exportDocx } from "@/lib/docx-export";
import type { MergeContext } from "@/lib/merge-template";

/**
 * "Xuất .docx" — downloads a Word file of the document. Pass `ctx` to resolve
 * merge fields (a finished contract) or omit it to emit literal `{{token}}`
 * text (a reusable template). `lineItems` expands the báo giá block. The `docx`
 * library is lazy-loaded inside.
 */
export function DocxExportButton({
  body,
  ctx = null,
  lineItems = null,
  title,
  fileName,
  label = "Xuất .docx",
}: {
  body: string;
  ctx?: MergeContext | null;
  lineItems?: LineItemsData | null;
  title: string;
  fileName: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    setBusy(true);
    try {
      await exportDocx({ body, ctx, lineItems, title, fileName });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={() => void onExport()}
    >
      <FileDown />
      {busy ? "Đang xuất…" : label}
    </Button>
  );
}
