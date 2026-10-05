import type { Contract } from "../../types";

/**
 * The one address of a hợp đồng's document page. A contract that belongs to a
 * công trình lives inside it (`/projects/{pid}/contracts/{id}`); a standalone
 * one keeps `/contracts/{id}`, which redirects a project contract here.
 */
export function contractHref(
  contract: Pick<Contract, "id" | "project_id">
): string {
  return contract.project_id
    ? `/projects/${contract.project_id}/contracts/${contract.id}`
    : `/contracts/${contract.id}`;
}
