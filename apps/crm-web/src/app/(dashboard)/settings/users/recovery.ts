import { akFetch } from "@/utils/authentik-admin/authentik-admin";

/**
 * A one-day link that lets the account holder set their own password — the
 * only way a password ever gets set from the CRM (no admin-typed passwords).
 * Authentik builds it from the brand's Recovery flow (`crm-recovery`, created
 * by `setup-authentik-crm.py --user-admin`); without one it answers 400.
 *
 * Plain module, not a server action: it is only ever called from inside an
 * action that has already passed the gate.
 */
export async function mintRecoveryLink(pk: number): Promise<string> {
  const { link } = await akFetch<{ link: string }>(
    `/core/users/${pk}/recovery/`,
    { method: "POST" }
  );
  return link;
}
