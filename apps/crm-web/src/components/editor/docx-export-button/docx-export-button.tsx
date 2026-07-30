"use client";

import { FileDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@yan/ui/components/button";

import type { LineItemsData } from "@/components/editor/lexical-document/lexical-document";
import { exportDocx } from "@/utils/docx-export/docx-export";
import type { MergeContext } from "@/utils/merge-template/merge-template";

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
    } catch (err) {
      // exportDocx refuses rather than writing unresolved ⟨token?⟩ markers into a
      // customer-facing file. Without this the throw was an unhandled rejection
      // and the click looked like it simply did nothing.
      toast.error("Không thể xuất .docx", {
        description:
          err instanceof Error ? err.message : "Lỗi không xác định khi xuất.",
      });
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
