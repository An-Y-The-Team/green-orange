import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { listProjects } from "@/app/(dashboard)/projects/queries";
import { PageHeader } from "@/components/page-header";

import { ContractProjectPicker } from "./contract-project-picker";

// "+ Hợp đồng mới" entry (crm-ui-redesign.md, 2026-07-24): pick the project,
// then author in the existing project-scoped editor.
export default async function NewContractPage() {
  const projects = await listProjects();
  const options = projects.map((p) => ({
    id: p.id,
    label: `${p.code} · ${p.name}`,
  }));

  return (
    <>
      <Link
        href="/contracts"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại hợp đồng
      </Link>

      <PageHeader title="Tạo hợp đồng" description="Chọn công trình để soạn" />

      <ContractProjectPicker projects={options} />
    </>
  );
}
