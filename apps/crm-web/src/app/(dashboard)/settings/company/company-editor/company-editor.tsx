"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@yan/ui/components/button";

import { EDITOR_NODES } from "@/components/editor/editor-nodes";
import { EDITOR_THEME } from "@/components/editor/editor-theme";
import { TokenPalette } from "@/components/editor/token-palette/token-palette";
import { Toolbar } from "@/components/editor/toolbar/toolbar";
import { SaveStatusBadge, useAutosave } from "@/components/editor/use-autosave";
import type { CompanyData, CompanyInfo } from "@/config/company";
import { INITIAL_ACTION_STATE } from "@/constants/server-action";
import { lexicalPlainText } from "@/utils/lexical-build/lexical-build";
import {
  CONTRACT_TOKENS,
  companyContext,
  resolveMergeFieldText,
} from "@/utils/merge-template/merge-template";

import { updateCompany } from "../actions/update-company";

/** The inline "type on the page" input style, sized by the caller. */
const LINE =
  "w-full bg-transparent outline-none placeholder:italic placeholder:text-zinc-300";
/** Bordered input for the labelled detail rows below the letterhead. */
const FIELD =
  "w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 outline-none focus:border-zinc-500";

/** Header templates may only use company fields. */
const COMPANY_TOKENS = CONTRACT_TOKENS.filter((t) =>
  t.token.startsWith("company.")
);

/**
 * Docs-style company profile editor. Three parts, all autosaving:
 *   • the rich-text document header (letterhead + Quốc hiệu) used by contracts,
 *     edited like a contract template — chips, formatting, alignment;
 *   • the structured letterhead (quotes/settlements print this), edited inline
 *     exactly where it prints;
 *   • the Bên B details (representative, bank) merge tokens read.
 * Every field cleared falls back to the built-in default at print time.
 */
export function CompanyEditor({ company }: { company: CompanyData }) {
  const router = useRouter();
  const [values, setValues] = useState<CompanyInfo>(company);
  const { status, schedule, flush } = useAutosave("saved");

  // The header template, seeded once with chip values resolved from the
  // current profile (field edits reflect in chips on next open).
  const [seedHeader] = useState(() =>
    resolveMergeFieldText(company.header_body, companyContext(company))
  );
  const headerRef = useRef(seedHeader);

  const persist = async (next: CompanyInfo): Promise<boolean> => {
    const payload: Record<string, string | null> = Object.fromEntries(
      Object.entries(next).map(([k, v]) => [k, v.trim() || null])
    );
    // An emptied-out header falls back to the built-in template.
    payload.header_body =
      lexicalPlainText(headerRef.current) === "" ? null : headerRef.current;
    const result = await updateCompany(INITIAL_ACTION_STATE, payload);
    return result.success;
  };

  const onChange = (patch: Partial<CompanyInfo>) => {
    const next = { ...values, ...patch };
    setValues(next);
    schedule(() => persist(next));
  };

  const onHeaderChange = (json: string) => {
    if (json === headerRef.current) return;
    headerRef.current = json;
    const next = values;
    schedule(() => persist(next));
  };

  const onDone = async () => {
    if (!(await flush())) return; // stay here — nothing was lost yet
    router.push("/settings");
  };

  const field = (key: keyof CompanyInfo, className: string, label: string) => (
    <input
      aria-label={label}
      className={className}
      value={values[key]}
      placeholder={label}
      onChange={(e) => onChange({ [key]: e.target.value })}
    />
  );

  const initialConfig = {
    namespace: "company-header-editor",
    theme: EDITOR_THEME,
    nodes: [...EDITOR_NODES],
    editorState: seedHeader,
    onError(error: Error) {
      throw error;
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-md border bg-background/95 p-1.5 shadow-sm backdrop-blur">
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
            <TokenPalette
              tokens={COMPANY_TOKENS}
              showLineItems={false}
              resolve={(token) => companyContext(values)[token]}
            />
          </div>
        </details>
        <div className="ml-auto flex items-center gap-2">
          <SaveStatusBadge status={status} />
          <Button
            type="button"
            size="sm"
            disabled={status === "saving"}
            onClick={onDone}
          >
            Xong
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-muted px-2 py-8 sm:px-8">
        <div className="print-sheet mx-auto max-w-3xl bg-white p-10 text-sm text-zinc-900 shadow-sm ring-1 ring-border">
          {/* Đầu trang hợp đồng — rich text, edited like a template. */}
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            Đầu trang hợp đồng (letterhead + Quốc hiệu)
          </p>
          <div className="relative rounded-md border border-dashed border-zinc-300 p-3">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  aria-label="Đầu trang tài liệu"
                  className="min-h-[6rem] text-xs leading-relaxed text-zinc-900 outline-none"
                />
              }
              placeholder={
                <div className="pointer-events-none absolute left-3 top-3 text-xs text-zinc-400">
                  Soạn đầu trang tài liệu…
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>

          {/* Letterhead báo giá/quyết toán — edited exactly where it prints. */}
          <p className="mb-1 mt-8 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            Letterhead báo giá / quyết toán
          </p>
          <header className="flex items-start justify-between gap-6 border-b border-zinc-300 pb-5">
            <div className="flex flex-1 items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-base font-bold text-white">
                {values.name.trim().charAt(0) || "G"}
              </div>
              <div className="flex-1">
                {field(
                  "name",
                  `${LINE} text-sm font-bold uppercase leading-tight`,
                  "Tên công ty"
                )}
                {field("tagline", `${LINE} text-xs text-zinc-600`, "Slogan")}
              </div>
            </div>
            <div className="w-72 text-right text-xs leading-relaxed text-zinc-600">
              {field("address", `${LINE} text-right`, "Địa chỉ")}
              <div className="flex items-center justify-end gap-1">
                <span className="shrink-0">ĐT:</span>
                {field("phone", `${LINE} max-w-24 text-right`, "Điện thoại")}
                <span>·</span>
                {field("email", `${LINE} max-w-44 text-right`, "Email")}
              </div>
              <div className="flex items-center justify-end gap-1">
                <span className="shrink-0">MST:</span>
                {field("tax_id", `${LINE} max-w-28 text-right`, "Mã số thuế")}
              </div>
            </div>
          </header>

          {/* Bên B details — merge tokens + signature defaults read these. */}
          <div className="mt-8 grid gap-8 text-xs sm:grid-cols-2">
            <section className="space-y-2">
              <h2 className="font-semibold uppercase">Đại diện pháp luật</h2>
              <label className="block space-y-1">
                <span className="text-zinc-500">Họ tên</span>
                {field("representative", FIELD, "Họ tên đại diện")}
              </label>
              <label className="block space-y-1">
                <span className="text-zinc-500">Chức vụ</span>
                {field("representative_title", FIELD, "Chức vụ")}
              </label>
              <label className="block space-y-1">
                <span className="text-zinc-500">Website</span>
                {field("website", FIELD, "Website")}
              </label>
            </section>
            <section className="space-y-2">
              <h2 className="font-semibold uppercase">Tài khoản ngân hàng</h2>
              <label className="block space-y-1">
                <span className="text-zinc-500">Số tài khoản</span>
                {field("bank_account", FIELD, "Số tài khoản")}
              </label>
              <label className="block space-y-1">
                <span className="text-zinc-500">Ngân hàng</span>
                {field("bank_name", FIELD, "Ngân hàng")}
              </label>
              <label className="block space-y-1">
                <span className="text-zinc-500">Chi nhánh/PGD</span>
                {field("bank_branch", FIELD, "Chi nhánh/PGD")}
              </label>
            </section>
          </div>
        </div>
      </div>

      <HistoryPlugin />
      <OnChangePlugin
        ignoreSelectionChange
        onChange={(editorState) =>
          onHeaderChange(JSON.stringify(editorState.toJSON()))
        }
      />
    </LexicalComposer>
  );
}
