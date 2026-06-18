import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";

import { listContractTemplates } from "../queries";
import { ContractForm } from "./contract-form";

export default async function NewContractPage() {
  const templates = (await listContractTemplates()).filter((t) => t.is_active);

  return (
    <>
      <Link
        href="/contracts"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách
      </Link>
      <PageHeader
        title="Hợp đồng mới"
        description="Điền thông tin và chọn mẫu in cho hợp đồng."
      />
      <ContractForm templates={templates} />
    </>
  );
}
