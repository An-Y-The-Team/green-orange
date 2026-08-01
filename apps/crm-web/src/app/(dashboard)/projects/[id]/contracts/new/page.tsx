import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@yan/ui/components/button";

import { ContractStatus } from "@/app/(dashboard)/contracts/enums";
import {
  getContract,
  listContractTemplates,
} from "@/app/(dashboard)/contracts/queries";
import { getProject } from "@/app/(dashboard)/projects/queries";
import { getDealQuote } from "@/app/(dashboard)/quotes/queries";
import { BACK_TO } from "@/constants/labels";

import { ContractEditor } from "./contract-editor/contract-editor";

// Stage-4 contract authoring — born from a project. `?edit=<id>` loads an
// existing draft; otherwise a fresh contract seeded from a chosen template.
export default async function NewContractPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const projectId = Number(id);

  const project = await getProject(projectId);
  if (!project) notFound();

  const [dealQuote, templates, contract] = await Promise.all([
    getDealQuote(projectId),
    listContractTemplates(),
    edit ? getContract(Number(edit)) : Promise.resolve(undefined),
  ]);

  const backLink = (
    <Link
      href={`/projects/${projectId}`}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      {BACK_TO.project}
    </Link>
  );

  // A signed contract is frozen. The edit links are already hidden for one, but
  // this URL is hand-typable — and the editor autosaves, so refuse to mount it
  // rather than rely on the server rejecting the first keystroke.
  if (contract && contract.status !== ContractStatus.DRAFT) {
    return (
      <>
        {backLink}

        <div className="rounded-lg border border-border bg-muted/40 p-6 text-sm">
          <p className="font-medium">Hợp đồng đã ký — không thể sửa</p>
          <p className="mt-1 text-muted-foreground">
            Nội dung hợp đồng {contract.code} đã được khóa từ khi ký. Cần thay
            đổi thì lập hợp đồng mới (phụ lục) thay vì sửa bản đã ký.
          </p>
          <Button
            className="mt-4"
            size="sm"
            variant="outline"
            render={
              <Link href={`/contracts/${contract.id}`}>
                <Printer className="size-4" />
                Xem / In hợp đồng
              </Link>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      {backLink}

      <h1 className="mb-4 text-xl font-semibold">
        {contract ? `Sửa hợp đồng ${contract.code}` : "Tạo hợp đồng"}
      </h1>

      <ContractEditor
        project={project}
        dealQuote={dealQuote}
        templates={templates.filter(
          (t) => t.is_active || t.id === contract?.template_id
        )}
        contract={contract}
      />
    </>
  );
}
