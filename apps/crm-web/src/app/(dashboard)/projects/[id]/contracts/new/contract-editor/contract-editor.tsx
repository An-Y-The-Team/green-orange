"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

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
import { PageEditor } from "@/components/editor/page-editor/page-editor";
import { SaveStatusBadge, useAutosave } from "@/components/editor/use-autosave";
import { SELECT_CLASS } from "@/components/form-bits/form-bits";
import { DEFAULT_HEADER_VARIANT } from "@/constants/header-variant";
import { INITIAL_ACTION_STATE } from "@/constants/server-action";
import {
  ensureLexicalBody,
  lexicalPlainText,
} from "@/utils/lexical-build/lexical-build";
import {
  buildContractContext,
  resolveMergeFieldText,
} from "@/utils/merge-template/merge-template";

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

  const seedTemplate = contract?.template_id
    ? templates.find((t) => t.id === contract.template_id)
    : undefined;

  const [templateId, setTemplateId] = useState<number | undefined>(
    contract?.template_id ?? undefined
  );
  const { status, schedule, flush } = useAutosave(contract ? "saved" : "idle");
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
  const ctx = buildContractContext(previewContract, dealQuote);

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

  // Refs (not state) so the debounced persist always sees the latest.
  const bodyRef = useRef(seedBody);
  const templateIdRef = useRef(templateId);
  const contractIdRef = useRef(contract?.id);

  const persist = async (): Promise<boolean> => {
    // Superset payload: createContract needs project_id; updateContract's zod
    // schema strips the extra key.
    const payload = {
      project_id: project.id,
      template_id: templateIdRef.current,
      body: bodyRef.current,
      note: contract?.note ?? undefined,
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

    return result.success;
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

  const onDone = async () => {
    if (!(await flush())) return; // stay here — nothing was lost yet
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
      headerVariant={selected?.header_style ?? DEFAULT_HEADER_VARIANT}
      resolve={(token) => ctx[token]}
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
      }
    />
  );
}
