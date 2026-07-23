import { contractTemplates } from "@/data/mock/contract-templates";
import { contracts } from "@/data/mock/contracts";
import { API_URL, apiFetch, apiFetchSafe } from "@/lib/http";

import type { Contract, ContractTemplate } from "./types";

export async function listContracts(): Promise<Contract[]> {
  return API_URL ? apiFetchSafe<Contract[]>("/contracts", []) : contracts;
}

export async function getContract(id: number): Promise<Contract | undefined> {
  if (API_URL) {
    return apiFetch<Contract>(`/contracts/${id}`).catch(() => undefined);
  }
  return contracts.find((c) => c.id === id);
}

/** All contracts for a project (mirrors GET /contracts?project_id=). */
export async function getProjectContracts(
  projectId: number
): Promise<Contract[]> {
  return API_URL
    ? apiFetchSafe<Contract[]>(`/contracts?project_id=${projectId}`, [])
    : contracts.filter((c) => c.project_id === projectId);
}

export async function listContractTemplates(): Promise<ContractTemplate[]> {
  return API_URL
    ? apiFetchSafe<ContractTemplate[]>("/contract-templates", [])
    : contractTemplates;
}

export async function getContractTemplate(
  id: number
): Promise<ContractTemplate | undefined> {
  if (API_URL) {
    return apiFetch<ContractTemplate>(`/contract-templates/${id}`).catch(
      () => undefined
    );
  }
  return contractTemplates.find((t) => t.id === id);
}
