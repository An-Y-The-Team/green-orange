import { notFound, redirect } from "next/navigation";

import { loadCompany } from "@/app/(dashboard)/settings/company/queries";
import { BACK_TO } from "@/constants/labels";

import { ContractDocument } from "../components/contract-document/contract-document";
import { getContract } from "../queries";
import { contractHref } from "../utils/contract-href/contract-href";

// A standalone contract's document page. A contract that belongs to a công
// trình lives inside it (/projects/{pid}/contracts/{id}), so this address
// redirects there — old bookmarks and cross-project links keep working while
// opening a job's contract never leaves the job.
export default async function ContractDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contract, companyLoad] = await Promise.all([
    getContract(Number(id)),
    loadCompany(),
  ]);

  if (!contract) {
    notFound();
  }
  if (contract.project_id) {
    redirect(contractHref(contract));
  }

  return (
    <ContractDocument
      contract={contract}
      backHref="/contracts"
      backLabel={BACK_TO.list}
      companyLoad={companyLoad}
    />
  );
}
