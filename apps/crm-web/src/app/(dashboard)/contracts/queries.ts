import { apiFetch, apiFetchDetail, apiFetchSafe } from "@/utils/http/http";

import type { Contract, ContractTemplate } from "./types";

export async function listContracts(): Promise<Contract[]> {
  return apiFetchSafe<Contract[]>("/contracts", []);
}

export async function getContract(id: number): Promise<Contract | undefined> {
  return apiFetchDetail<Contract>(`/contracts/${id}`);
}

/** All contracts for a project (mirrors GET /contracts?project_id=). */
export async function getProjectContracts(
  projectId: number
): Promise<Contract[]> {
  return apiFetchSafe<Contract[]>(`/contracts?project_id=${projectId}`, []);
}

export async function listContractTemplates(): Promise<ContractTemplate[]> {
  return apiFetchSafe<ContractTemplate[]>("/contract-templates", []);
}

export async function getContractTemplate(
  id: number
): Promise<ContractTemplate | undefined> {
  return apiFetch<ContractTemplate>(`/contract-templates/${id}`).catch(
    () => undefined
  );
}
