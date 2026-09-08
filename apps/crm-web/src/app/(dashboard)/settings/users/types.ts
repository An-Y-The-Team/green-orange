// Authentik `/core/users/` and `/core/groups/` shapes — only the fields the
// Người dùng page reads. Identity lives in Authentik, not in a CRM table.
export interface AkGroup {
  pk: string;
  name: string;
}

export interface AkUser {
  pk: number;
  username: string;
  name: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  /** ISO datetime, null for an account that has never signed in. */
  last_login: string | null;
  groups_obj: AkGroup[];
}
