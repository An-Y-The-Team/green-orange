"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@yan/ui/components/button";

import { createContract } from "@/app/(dashboard)/contracts/actions/create-contract";
import { updateContract } from "@/app/(dashboard)/contracts/actions/update-contract";
import { DEFAULT_CONTRACT_BODY } from "@/app/(dashboard)/contracts/default-body";
import { ContractStatus } from "@/app/(dashboard)/contracts/enums";
import type {
  Contract,
  ContractTemplate,
} from "@/app/(dashboard)/contracts/types";
import type { Project } from "@/app/(dashboard)/projects/types";
import type { Quote } from "@/app/(dashboard)/quotes/types";
import { useCompany } from "@/components/company-provider/company-provider";
import { PageEditor } from "@/components/editor/page-editor/page-editor";
import {
  type SaveResult,
  SaveStatusBadge,
  useAutosave,
} from "@/components/editor/use-autosave";
import { SELECT_CLASS } from "@/components/form-bits/form-bits";
import { HeaderVariant } from "@/constants/header-variant";
import { INITIAL_ACTION_STATE } from "@/constants/server-action";
import {
  ensureLexicalBody,
  lexicalPlainText,
} from "@/utils/lexical-build/lexical-build";
import {
  buildContractContext,
  resolveMergeFieldText,
  stripMergeFieldText,
} from "@/utils/merge-template/merge-template";

/** Signature footer lines, as edited (empty string = unset → fallback). */
type Reps = {
  rep_a_label: string;
  rep_a_name: string;
  rep_a_title: string;
  rep_b_label: string;
  rep_b_name: string;
  rep_b_title: string;
};

/**
 * The signature footer as an editable part of the sheet: SignatureBlocks'
 * layout with the column label and signer name/title lines as inline inputs.
 * Placeholders show what prints when a line is left empty (the default
 * ĐẠI DIỆN BÊN A/B labels; the company representative on Bên B).
 */
function EditableSignatureBlocks({
  reps,
  onChange,
}: {
  reps: Reps;
  onChange: (patch: Partial<Reps>) => void;
}) {
  const company = useCompany();
  const line =
    "w-full bg-transparent text-center outline-none placeholder:italic placeholder:text-zinc-300";
  const columns = [
    {
      key: "a",
      labelKey: "rep_a_label",
      nameKey: "rep_a_name",
      titleKey: "rep_a_title",
      labelPlaceholder: "ĐẠI DIỆN BÊN A",
      namePlaceholder: "Họ tên người ký",
      titlePlaceholder: "Chức vụ",
    },
    {
      key: "b",
      labelKey: "rep_b_label",
      nameKey: "rep_b_name",
      titleKey: "rep_b_title",
      labelPlaceholder: "ĐẠI DIỆN BÊN B",
      namePlaceholder: company.representative,
      titlePlaceholder: company.representative_title,
    },
  ] as const;

  return (
    <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs">
      {columns.map((col) => (
        <div key={col.key}>
          <input
            aria-label={`${col.labelPlaceholder} — nhãn cột`}
            className={`${line} font-semibold uppercase placeholder:not-italic placeholder:font-semibold`}
            placeholder={col.labelPlaceholder}
            value={reps[col.labelKey]}
            onChange={(e) => onChange({ [col.labelKey]: e.target.value })}
          />
          <p className="mt-1 italic text-zinc-500">(Ký, ghi rõ họ tên)</p>
          <div className="h-20" />
          <input
            aria-label={`${col.labelPlaceholder} — họ tên`}
            className={`${line} font-semibold uppercase`}
            placeholder={col.namePlaceholder}
            value={reps[col.nameKey]}
            onChange={(e) => onChange({ [col.nameKey]: e.target.value })}
          />
          <input
            aria-label={`${col.labelPlaceholder} — chức vụ`}
            className={`${line} text-zinc-600`}
            placeholder={col.titlePlaceholder}
            value={reps[col.titleKey]}
            onChange={(e) => onChange({ [col.titleKey]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Google-Docs-style contract authoring: one editable A4 page (no separate
 * preview column) under a sticky toolbar, saving automatically as you type.
 * The first meaningful change mints the draft contract; later changes PATCH it.
 */
export function ContractEditor({
  project,
  dealQuote,
  templates,
  contract,
}: {
  project: Project;
  dealQuote?: Quote;
  templates: ContractTemplate[];
  contract?: Contract;
}) {
  const router = useRouter();
  const company = useCompany();

  const seedTemplate = contract?.template_id
    ? templates.find((t) => t.id === contract.template_id)
    : undefined;

  const [templateId, setTemplateId] = useState<number | undefined>(
    contract?.template_id ?? undefined
  );
  const { status, message, schedule, flush } = useAutosave(
    contract ? "saved" : "idle"
  );
  // The editor reads its initial value once; bump this key to remount it
  // (and reseed its content) when the author picks a template.
  const [seed, setSeed] = useState(0);

  // The chips have no preview column to lean on anymore, so seed the editor
  // with their live values baked into the display text (tokens stay intact).
  const previewContract: Contract = {
    id: contract?.id ?? 0,
    project_id: project.id,
    code: contract?.code ?? "(dự thảo)",
    status: contract?.status ?? ContractStatus.DRAFT,
    signed_date: contract?.signed_date ?? null,
    note: contract?.note ?? null,
    template_id: templateId ?? null,
    body: "",
    project: {
      id: project.id,
      code: project.code,
      name: project.name,
      client: {
        id: project.client?.id ?? project.client_id,
        name: project.client?.name ?? "",
      },
    },
  };
  const ctx = buildContractContext(previewContract, dealQuote, company);

  // ensureLexicalBody: v1-era contracts stored plain text, which would throw
  // inside Lexical's initial parse — wrap it so older contracts stay editable.
  // An existing contract with nothing stored at all seeds from the same
  // default document its print page shows (a fresh contract stays blank so
  // the template picker flow isn't nagged by the replace-content confirm).
  const [seedBody, setSeedBody] = useState(() =>
    resolveMergeFieldText(
      ensureLexicalBody(contract?.body ?? seedTemplate?.body) ||
        (contract ? DEFAULT_CONTRACT_BODY : ""),
      ctx
    )
  );

  // Labels prefill with the standard text (still editable); clearing one
  // falls back to the same default at print time.
  const [reps, setReps] = useState<Reps>({
    rep_a_label: contract?.rep_a_label ?? "ĐẠI DIỆN BÊN A",
    rep_a_name: contract?.rep_a_name ?? "",
    rep_a_title: contract?.rep_a_title ?? "",
    rep_b_label: contract?.rep_b_label ?? "ĐẠI DIỆN BÊN B",
    rep_b_name: contract?.rep_b_name ?? "",
    rep_b_title: contract?.rep_b_title ?? "",
  });

  // Refs (not state) so the debounced persist always sees the latest.
  const bodyRef = useRef(seedBody);
  const templateIdRef = useRef(templateId);
  const contractIdRef = useRef(contract?.id);
  const repsRef = useRef(reps);

  const persist = async (): Promise<SaveResult> => {
    // Superset payload: createContract needs project_id; updateContract's zod
    // schema strips the extra key.
    const r = repsRef.current;
    const payload = {
      project_id: project.id,
      template_id: templateIdRef.current,
      // Chips display live values while editing; storage keeps token labels.
      body: stripMergeFieldText(bodyRef.current),
      note: contract?.note ?? undefined,
      // null clears a footer line (labels then fall back to ĐẠI DIỆN BÊN A/B,
      // the B-side signer to the company rep).
      rep_a_label: r.rep_a_label.trim() || null,
      rep_a_name: r.rep_a_name.trim() || null,
      rep_a_title: r.rep_a_title.trim() || null,
      rep_b_label: r.rep_b_label.trim() || null,
      rep_b_name: r.rep_b_name.trim() || null,
      rep_b_title: r.rep_b_title.trim() || null,
    };
    const result = contractIdRef.current
      ? await updateContract(
          contractIdRef.current,
          project.id,
          INITIAL_ACTION_STATE,
          payload
        )
      : await createContract(INITIAL_ACTION_STATE, payload);

    if (result.success && !contractIdRef.current) {
      contractIdRef.current = (result.data as Contract).id;
      // Make a refresh resume this draft — without router.replace, which would
      // re-render the page and remount the editor mid-typing.
      window.history.replaceState(
        null,
        "",
        `/projects/${project.id}/contracts/new?edit=${contractIdRef.current}`
      );
    }

    // Keep the server's wording: it carries the actionable reason (a frozen
    // signed contract, a closed project), which a bare boolean would drop.
    return result.success
      ? { status: "saved" }
      : { status: "error", message: result.message ?? undefined };
  };

  const onBodyChange = (json: string) => {
    if (json === bodyRef.current) return;
    bodyRef.current = json;
    // Never mint a draft for a still-empty document (e.g. Lexical's initial
    // normalisation pass on mount).
    if (!contractIdRef.current && lexicalPlainText(json) === "") return;
    schedule(persist);
  };

  const onPickTemplate = (value: string) => {
    const id = value ? Number(value) : undefined;
    if (
      lexicalPlainText(bodyRef.current) !== "" &&
      !window.confirm("Thay nội dung hiện tại bằng nội dung mẫu?")
    ) {
      return;
    }
    setTemplateId(id);
    templateIdRef.current = id;
    // Pre-fill the body from the chosen template — the server does NOT copy it.
    const tpl = templates.find((t) => t.id === id);
    const next = resolveMergeFieldText(tpl?.body ?? "", ctx);
    bodyRef.current = next;
    setSeedBody(next);
    setSeed((s) => s + 1);
    if (contractIdRef.current || lexicalPlainText(next) !== "")
      schedule(persist);
  };

  const onRepsChange = (patch: Partial<Reps>) => {
    const next = { ...repsRef.current, ...patch };
    repsRef.current = next;
    setReps(next);
    schedule(persist);
  };

  const onDone = async () => {
    const result = await flush();
    if (result.status !== "saved") {
      // Stay put — nothing is lost yet — but say why, or the button looks dead.
      toast.error("Chưa lưu được hợp đồng", {
        description: result.message ?? "Vui lòng thử lại.",
      });
      return;
    }
    router.push(`/projects/${project.id}`);
  };

  const selected = templates.find((t) => t.id === templateId);

  return (
    <PageEditor
      key={seed}
      value={seedBody}
      onChange={onBodyChange}
      title={selected?.doc_title ?? "HỢP ĐỒNG"}
      subtitle={contract ? `Số: ${contract.code}` : undefined}
      // Contracts default to the national header (letterhead + Quốc hiệu) —
      // a Vietnamese contract must carry both.
      headerVariant={selected?.header_style ?? HeaderVariant.NATIONAL}
      resolve={(token) => ctx[token]}
      footer={<EditableSignatureBlocks reps={reps} onChange={onRepsChange} />}
      toolbarExtra={
        <select
          aria-label="Mẫu hợp đồng"
          className={`${SELECT_CLASS} !h-7 max-w-56 text-xs`}
          value={templateId ?? ""}
          onChange={(e) => onPickTemplate(e.target.value)}
        >
          <option value="">— Không dùng mẫu —</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      }
      status={
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
      }
    />
  );
}
