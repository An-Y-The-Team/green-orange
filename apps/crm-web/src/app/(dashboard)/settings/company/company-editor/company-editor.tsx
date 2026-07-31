"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@yan/ui/components/button";

import { TemplateBlock } from "@/components/editor/template-block/template-block";
import type { PaletteToken } from "@/components/editor/token-palette/token-palette";
import {
  type SaveResult,
  SaveStatusBadge,
  useAutosave,
} from "@/components/editor/use-autosave";
import type { CompanyData, CompanyInfo } from "@/config/company";
import { INITIAL_ACTION_STATE } from "@/constants/server-action";
import { lexicalPlainText } from "@/utils/lexical-build/lexical-build";
import {
  companyContext,
  resolveMergeFieldText,
  stripMergeFieldText,
} from "@/utils/merge-template/merge-template";

import { updateCompany } from "../actions/update-company";
import { readLogoFile } from "./read-logo-file";

/** Bordered input for the labelled data fields. */
const FIELD =
  "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * The company fields, grouped as they are presented. Each one is a merge token
 * the header templates above can insert, so the labels here and the chip labels
 * in the "Chèn" menu deliberately match — an operator seeing a green chip should
 * be able to find the field that fills it.
 */
const FIELD_GROUPS: {
  heading: string;
  fields: { key: keyof CompanyInfo; label: string; token: string }[];
}[] = [
  {
    heading: "Thông tin công ty",
    fields: [
      { key: "name", label: "Tên công ty", token: "company.name" },
      { key: "tagline", label: "Slogan", token: "company.tagline" },
      { key: "address", label: "Địa chỉ", token: "company.address" },
      { key: "tax_id", label: "Mã số thuế (MST)", token: "company.tax_id" },
      { key: "phone", label: "Điện thoại", token: "company.phone" },
      { key: "email", label: "Email", token: "company.email" },
      { key: "website", label: "Website", token: "company.website" },
    ],
  },
  {
    heading: "Đại diện pháp luật",
    fields: [
      { key: "representative", label: "Họ tên", token: "company.rep" },
      {
        key: "representative_title",
        label: "Chức vụ",
        token: "company.rep_title",
      },
    ],
  },
  {
    heading: "Tài khoản ngân hàng",
    fields: [
      {
        key: "bank_account",
        label: "Số tài khoản",
        token: "company.bank_account",
      },
      { key: "bank_name", label: "Ngân hàng", token: "company.bank_name" },
      {
        key: "bank_branch",
        label: "Chi nhánh/PGD",
        token: "company.bank_branch",
      },
    ],
  },
];

/** The "Chèn" menu, labelled for this page rather than for a contract's Bên B. */
const HEADER_TOKENS: PaletteToken[] = FIELD_GROUPS.flatMap((g) =>
  g.fields.map((f) => ({ token: f.token, label: f.label }))
);

/**
 * Company profile authoring. Both document header templates are rich text with
 * merge chips (letterhead — on every document; Quốc hiệu — legal documents
 * only), and the values they render come from the labelled fields below. The
 * chips are visually distinct on purpose: they mark what the fields populate,
 * so nobody retypes the company name into a template.
 */
export function CompanyEditor({ company }: { company: CompanyData }) {
  const router = useRouter();
  const [values, setValues] = useState<CompanyInfo>(company);
  const [logo, setLogo] = useState(company.logo);
  const { status, message, schedule, flush } = useAutosave("saved");
  const fileInput = useRef<HTMLInputElement>(null);

  // Templates are seeded once with chips resolved against the current profile;
  // refs (not state) so the debounced save always sees the latest text.
  const [seed] = useState(() => {
    const ctx = companyContext(company);
    return {
      letterhead: resolveMergeFieldText(company.letterhead_body, ctx),
      national: resolveMergeFieldText(company.national_body, ctx),
    };
  });
  const letterheadRef = useRef(seed.letterhead);
  const nationalRef = useRef(seed.national);
  const logoRef = useRef(company.logo);

  const persist = async (next: CompanyInfo): Promise<SaveResult> => {
    const payload: Record<string, string | null> = Object.fromEntries(
      Object.entries(next).map(([k, v]) => [k, v.trim() || null])
    );
    // Emptied-out templates fall back to the built-in defaults. Chips show live
    // values while editing; storage keeps the tokens.
    payload.letterhead_body =
      lexicalPlainText(letterheadRef.current) === ""
        ? null
        : stripMergeFieldText(letterheadRef.current);
    payload.national_body =
      lexicalPlainText(nationalRef.current) === ""
        ? null
        : stripMergeFieldText(nationalRef.current);
    payload.logo = logoRef.current || null;

    const result = await updateCompany(INITIAL_ACTION_STATE, payload);
    return result.success
      ? { status: "saved" }
      : { status: "error", message: result.message ?? undefined };
  };

  const save = () => schedule(() => persist(values));

  const onChange = (patch: Partial<CompanyInfo>) => {
    const next = { ...values, ...patch };
    setValues(next);
    schedule(() => persist(next));
  };

  const onTemplateChange = (
    ref: React.RefObject<string>,
    json: string
  ): void => {
    if (json === ref.current) return;
    ref.current = json;
    save();
  };

  const onPickLogo = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await readLogoFile(file);
      logoRef.current = dataUrl;
      setLogo(dataUrl);
      save();
    } catch (error) {
      toast.error("Không dùng được ảnh này", {
        description:
          error instanceof Error ? error.message : "Vui lòng chọn ảnh khác.",
      });
    }
  };

  const onRemoveLogo = () => {
    logoRef.current = "";
    setLogo("");
    if (fileInput.current) fileInput.current.value = "";
    save();
  };

  const onDone = async () => {
    const result = await flush();
    if (result.status !== "saved") {
      toast.error("Chưa lưu được thông tin công ty", {
        description: result.message ?? "Vui lòng thử lại.",
      });
      return;
    }
    router.push("/settings");
  };

  // Chips resolve against what is typed right now, so edits below show up in
  // the templates as soon as a chip is inserted.
  const ctx = companyContext(values);

  return (
    <>
      <div className="sticky top-0 z-20 flex items-center justify-between gap-2 rounded-md border bg-background/95 p-1.5 shadow-sm backdrop-blur">
        <p className="px-2 text-xs text-muted-foreground">
          Đầu trang & thông tin in trên mọi báo giá, hợp đồng, quyết toán.
        </p>
        <div className="flex items-center gap-2">
          <SaveStatusBadge status={status} message={message} />
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

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        {/* Templates — what the paper looks like. */}
        <div className="space-y-5 rounded-lg border bg-muted/30 p-4">
          <div className="space-y-1">
            <h2 className="text-sm font-medium">Mẫu đầu trang</h2>
            <p className="text-xs text-muted-foreground">
              Các ô{" "}
              <span className="rounded bg-emerald-100 px-1 font-medium text-emerald-800">
                màu xanh
              </span>{" "}
              là trường dữ liệu — nội dung lấy từ các mục bên phải, không nhập
              trực tiếp vào mẫu.
            </p>
          </div>

          {/* Logo — not part of the rich text; it prints beside the letterhead. */}
          <section className="space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              Logo
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed bg-white">
                {logo ? (
                  /* A stored data URL; next/image cannot process one here. */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo}
                    alt="Logo công ty"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    Chưa có logo
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => void onPickLogo(e.target.files?.[0])}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInput.current?.click()}
                >
                  <ImageUp className="size-4" />
                  {logo ? "Đổi logo" : "Tải logo lên"}
                </Button>
                {logo && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={onRemoveLogo}
                  >
                    <Trash2 className="size-4" />
                    Xoá
                  </Button>
                )}
              </div>
            </div>
          </section>

          <TemplateBlock
            label="Letterhead — in trên MỌI tài liệu"
            value={seed.letterhead}
            onChange={(json) => onTemplateChange(letterheadRef, json)}
            tokens={HEADER_TOKENS}
            ctx={ctx}
          />

          <TemplateBlock
            label="Quốc hiệu — chỉ in trên hợp đồng"
            hint="Không xuất hiện trên báo giá, quyết toán hay đề nghị thanh toán."
            value={seed.national}
            onChange={(json) => onTemplateChange(nationalRef, json)}
            tokens={HEADER_TOKENS}
            ctx={ctx}
          />
        </div>

        {/* Fields — the data those templates print. */}
        <div className="space-y-5">
          {FIELD_GROUPS.map((group) => (
            <section key={group.heading} className="space-y-2.5">
              <h2 className="text-sm font-medium">{group.heading}</h2>
              {group.fields.map((f) => (
                <label key={f.key} className="block space-y-1">
                  <span className="text-xs text-muted-foreground">
                    {f.label}
                  </span>
                  <input
                    aria-label={f.label}
                    className={FIELD}
                    placeholder={f.label}
                    value={values[f.key]}
                    onChange={(e) => onChange({ [f.key]: e.target.value })}
                  />
                </label>
              ))}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
