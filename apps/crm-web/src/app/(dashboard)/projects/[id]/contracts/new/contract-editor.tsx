"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { Label } from "@yan/ui/components/label";

import { createContract } from "@/app/(dashboard)/contracts/actions/create-contract";
import { updateContract } from "@/app/(dashboard)/contracts/actions/update-contract";
import { ContractStatus } from "@/app/(dashboard)/contracts/enums";
import type {
  Contract,
  ContractTemplate,
} from "@/app/(dashboard)/contracts/types";
import type { Project } from "@/app/(dashboard)/projects/types";
import type { Quote } from "@/app/(dashboard)/quotes/types";
import { DocumentShell, SignatureBlocks } from "@/components/document-shell";
import { LexicalDocument } from "@/components/editor/lexical-document";
import { RichEditor } from "@/components/editor/rich-editor";
import { selectClass } from "@/components/form-bits";
import { buildContractContext } from "@/lib/merge-template";

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
  const [isPending, startTransition] = useTransition();

  const seedTemplate = contract?.template_id
    ? templates.find((t) => t.id === contract.template_id)
    : undefined;

  const [templateId, setTemplateId] = useState<number | undefined>(
    contract?.template_id ?? undefined
  );
  // The RichEditor only reads its initial value once; bump this key to remount
  // it (and reseed its content) when the author picks a template.
  const [seed, setSeed] = useState(0);
  const [body, setBody] = useState(contract?.body ?? seedTemplate?.body ?? "");

  // Bind create vs update to the (prevState, input) shape useActionState wants.
  const action = contract
    ? updateContract.bind(null, contract.id, project.id)
    : createContract;
  const [state, formAction] = useActionState(action, {
    success: false,
  } as ServerActionState);

  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: () => router.push(`/projects/${project.id}`),
  });

  const onPickTemplate = (value: string) => {
    const id = value ? Number(value) : undefined;
    setTemplateId(id);
    // Pre-fill the body from the chosen template — the server does NOT copy it.
    const tpl = templates.find((t) => t.id === id);
    setBody(tpl?.body ?? "");
    setSeed((s) => s + 1);
  };

  const onSave = () => {
    // Superset payload: createContract needs project_id; updateContract's zod
    // schema strips the extra key. One shape keeps useActionState's inferred
    // payload type unambiguous across the create/update branches.
    startTransition(() =>
      formAction({
        project_id: project.id,
        template_id: templateId,
        body,
        note: contract?.note ?? undefined,
      })
    );
  };

  const selected = templates.find((t) => t.id === templateId);
  const docTitle = selected?.doc_title ?? "HỢP ĐỒNG";
  const headerVariant = selected?.header_style ?? "letterhead";
  const lineItems = dealQuote
    ? { items: dealQuote.items, vatRate: dealQuote.vat_rate }
    : null;

  // A Contract-shaped object for the live preview's merge context.
  const previewContract: Contract = {
    id: contract?.id ?? 0,
    project_id: project.id,
    code: contract?.code ?? "(dự thảo)",
    status: contract?.status ?? ContractStatus.DRAFT,
    signed_date: contract?.signed_date ?? null,
    note: contract?.note ?? null,
    template_id: templateId ?? null,
    body,
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

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Editor column */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="contract-template">Mẫu hợp đồng</Label>
          <select
            id="contract-template"
            className={selectClass}
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
          <p className="text-xs text-muted-foreground">
            Chọn mẫu để nạp nội dung; bạn có thể chỉnh sửa tự do bên dưới.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Nội dung hợp đồng</Label>
          <RichEditor key={seed} value={body} onChange={setBody} />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/projects/${project.id}`)}
          >
            Hủy
          </Button>
          <Button type="button" disabled={isPending} onClick={onSave}>
            {isPending ? "Đang lưu…" : "Lưu hợp đồng"}
          </Button>
        </div>
      </div>

      {/* Live preview column */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          Xem trước
        </p>
        <DocumentShell
          title={docTitle}
          subtitle={contract ? `Số: ${contract.code}` : undefined}
          headerVariant={headerVariant}
        >
          <LexicalDocument body={body} ctx={ctx} lineItems={lineItems} />
          <SignatureBlocks />
        </DocumentShell>
      </div>
    </div>
  );
}
