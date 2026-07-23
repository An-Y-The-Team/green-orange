import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getContract,
  listContractTemplates,
} from "@/app/(dashboard)/contracts/queries";
import { getProject } from "@/app/(dashboard)/projects/queries";
import { getDealQuote } from "@/app/(dashboard)/quotes/queries";

import { ContractEditor } from "./contract-editor";

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

  return (
    <>
      <Link
        href={`/projects/${projectId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại công trình
      </Link>

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
