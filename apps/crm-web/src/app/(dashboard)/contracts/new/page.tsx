import { BackLink } from "@/components/back-link/back-link";
import { PageHeader } from "@/components/page-header/page-header";
import { BACK_TO } from "@/constants/labels";

import { ContractProjectPicker } from "./contract-project-picker/contract-project-picker";

// "+ Hợp đồng mới" entry (crm-ui-redesign.md, 2026-07-24): pick the project,
// then author in the existing project-scoped editor.
export default function NewContractPage() {
  return (
    <>
      <BackLink href="/contracts">{BACK_TO.contract}</BackLink>

      <PageHeader title="Tạo hợp đồng" description="Chọn công trình để soạn" />

      <ContractProjectPicker />
    </>
  );
}
