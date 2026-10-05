import { notFound } from "next/navigation";

import { ContractDocument } from "@/app/(dashboard)/contracts/components/contract-document/contract-document";
import { getContract } from "@/app/(dashboard)/contracts/queries";
import { loadCompany } from "@/app/(dashboard)/settings/company/queries";
import { BACK_TO } from "@/constants/labels";

// A job's contract, inside the job: back goes to the project's Hợp đồng view,
// not the cross-project list. A contract id that belongs to another công trình
// (or none) is not this route's to show.
export default async function ProjectContractPage({
  params,
}: {
  // Next 16 route params are async.
  params: Promise<{ id: string; contractId: string }>;
}) {
  const { id, contractId } = await params;
  const [contract, companyLoad] = await Promise.all([
    getContract(Number(contractId)),
    loadCompany(),
  ]);

  if (!contract || contract.project_id !== Number(id)) {
    notFound();
  }

  return (
    <ContractDocument
      contract={contract}
      backHref={`/projects/${id}?view=contract`}
      backLabel={BACK_TO.project}
      companyLoad={companyLoad}
    />
  );
}
