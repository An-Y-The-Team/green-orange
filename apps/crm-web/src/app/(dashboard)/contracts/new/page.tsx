import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header/page-header";
import { BACK_TO } from "@/constants/labels";

import { ContractProjectPicker } from "./contract-project-picker/contract-project-picker";

// "+ Hợp đồng mới" entry (crm-ui-redesign.md, 2026-07-24): pick the project,
// then author in the existing project-scoped editor.
export default function NewContractPage() {
  return (
    <>
      <Link
        href="/contracts"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {BACK_TO.contract}
      </Link>

      <PageHeader title="Tạo hợp đồng" description="Chọn công trình để soạn" />

      <ContractProjectPicker />
    </>
  );
}
