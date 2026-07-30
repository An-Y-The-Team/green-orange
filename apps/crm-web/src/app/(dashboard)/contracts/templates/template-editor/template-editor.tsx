"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@yan/ui/components/button";
import { Input } from "@yan/ui/components/input";

import { DocxExportButton } from "@/components/editor/docx-export-button/docx-export-button";
import type { LineItemsData } from "@/components/editor/lexical-document/lexical-document";
import { PageEditor } from "@/components/editor/page-editor/page-editor";
import { SaveStatusBadge, useAutosave } from "@/components/editor/use-autosave";
import { SELECT_CLASS } from "@/components/form-bits/form-bits";
import { HeaderVariant } from "@/constants/header-variant";
import { INITIAL_ACTION_STATE } from "@/constants/server-action";
import {
  previewContext,
  resolveMergeFieldText,
} from "@/utils/merge-template/merge-template";

import { saveTemplate } from "../../actions/save-template";
import {
  type ContractTemplateFormValues,
  contractTemplateSchema,
} from "../../schema";
import type { ContractTemplate } from "../../types";

const SAMPLE_CTX = previewContext();

// Stand-in pricing so authors see the báo giá block's shape in a .docx export.
const SAMPLE_LINE_ITEMS: LineItemsData = {
  vatRate: 0.08,
  items: [
    {
      description: "Bảo hiểm công trình",
      unit: "Gói",
      quantity: 1,
      unit_price: 4_000_000,
    },
    {
      description: "Cung cấp & thay tấm trần",
      unit: "Tấm",
      quantity: 65,
      unit_price: 130_000,
    },
    {
      description: "Lăn epoxy sàn",
      unit: "m²",
      quantity: 143,
      unit_price: 165_000,
    },
  ],
};

/**
 * Google-Docs-style template authoring: one editable A4 page under a sticky
 * toolbar, saving automatically as you type. The printed title is edited
 * inline on the page itself; the template's meta (name, header style, active)
 * lives in the toolbar. Chips show the tokens' sample values.
 */
export function TemplateEditor({ template }: { template?: ContractTemplate }) {
  const router = useRouter();

  const [name, setName] = useState(template?.name ?? "");
  const [docTitle, setDocTitle] = useState(template?.doc_title ?? "");
  const [headerStyle, setHeaderStyle] = useState<HeaderVariant>(
    template?.header_style ?? HeaderVariant.NATIONAL
  );
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [seedBody] = useState(() =>
    resolveMergeFieldText(template?.body ?? "", SAMPLE_CTX)
  );
  const [body, setBody] = useState(seedBody);

  const templateIdRef = useRef(template?.id);
  const { status, schedule, flush } = useAutosave(template ? "saved" : "idle");

  const persist = async (
    values: ContractTemplateFormValues
  ): Promise<boolean | "invalid"> => {
    const parsed = contractTemplateSchema.safeParse(values);
    if (!parsed.success) return "invalid";

    const result = await saveTemplate(
      templateIdRef.current,
      INITIAL_ACTION_STATE,
      parsed.data
    );
    if (result.success && !templateIdRef.current && result.data) {
      templateIdRef.current = (result.data as ContractTemplate).id;
      // Make a refresh resume this draft — without router.replace, which would
      // re-render the page and remount the editor mid-typing.
      window.history.replaceState(
        null,
        "",
        `/contracts/templates/${templateIdRef.current}/edit`
      );
    }
    return result.success;
  };

  // Schedules a save with the just-changed field patched over current state —
  // the state setter hasn't landed yet when this runs in the same handler.
  const scheduleSave = (patch: Partial<ContractTemplateFormValues>) => {
    const values: ContractTemplateFormValues = {
      name,
      doc_title: docTitle,
      body,
      header_style: headerStyle,
      is_active: isActive,
      ...patch,
    };
    schedule(() => persist(values));
  };

  const onDone = async () => {
    if (!(await flush())) return; // stay here — nothing was lost yet
    router.push("/contracts/templates");
  };

  return (
    <PageEditor
      value={seedBody}
      onChange={(json) => {
        if (json === body) return;
        setBody(json);
        scheduleSave({ body: json });
      }}
      title={
        <input
          aria-label="Tiêu đề tài liệu (in trên đầu trang)"
          placeholder="TIÊU ĐỀ TÀI LIỆU"
          value={docTitle}
          onChange={(e) => {
            setDocTitle(e.target.value);
            scheduleSave({ doc_title: e.target.value });
          }}
          className="w-full bg-transparent text-center font-heading text-xl font-bold uppercase tracking-wide outline-none placeholder:text-zinc-300"
        />
      }
      headerVariant={headerStyle}
      resolve={(token) => SAMPLE_CTX[token]}
      toolbarExtra={
        <>
          <Input
            aria-label="Tên mẫu"
            placeholder="Tên mẫu…"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              scheduleSave({ name: e.target.value });
            }}
            className="h-7 w-44 text-xs"
          />
          <select
            aria-label="Kiểu đầu trang"
            className={`${SELECT_CLASS} !h-7 max-w-56 text-xs`}
            value={headerStyle}
            onChange={(e) => {
              const value = e.target.value as HeaderVariant;
              setHeaderStyle(value);
              scheduleSave({ header_style: value });
            }}
          >
            <option value={HeaderVariant.NATIONAL}>
              Quốc hiệu (CHXHCN Việt Nam) — hợp đồng
            </option>
            <option value={HeaderVariant.LETTERHEAD}>
              Letterhead công ty — báo giá/khác
            </option>
          </select>
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => {
                setIsActive(e.target.checked);
                scheduleSave({ is_active: e.target.checked });
              }}
              className="size-3.5"
            />
            Đang sử dụng
          </label>
          <DocxExportButton
            body={body}
            lineItems={SAMPLE_LINE_ITEMS}
            title={docTitle || "MẪU HỢP ĐỒNG"}
            fileName={`${docTitle || "mau-hop-dong"}.docx`}
            label="Xuất .docx (mẫu)"
          />
        </>
      }
      status={
        <div className="flex items-center gap-2">
          <SaveStatusBadge
            status={status}
            invalidHint="Chưa lưu — cần tên mẫu, tiêu đề & nội dung"
          />
          <Button
            type="button"
            size="sm"
            disabled={status === "saving"}
            onClick={onDone}
          >
            Xong
          </Button>
        </div>
      }
    />
  );
}
