import { contracts } from "@/data/mock/contracts";
import { API_URL, apiFetch, apiFetchSafe } from "@/lib/http";
import type { Contract } from "@/types";

export async function listContracts(): Promise<Contract[]> {
  return API_URL ? apiFetchSafe<Contract[]>("/contracts", []) : contracts;
}

export async function getContract(id: number): Promise<Contract | undefined> {
  if (API_URL) {
    return apiFetch<Contract>(`/contracts/${id}`).catch(() => undefined);
  }
  return contracts.find((c) => c.id === id);
}
