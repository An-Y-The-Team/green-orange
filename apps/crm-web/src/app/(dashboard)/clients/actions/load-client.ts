"use server";

import { getClient } from "../queries";
import type { Contact, Location } from "../types";

/**
 * Loader used by the project-intake form: when a client is picked, fetch its
 * type + dependent contacts/locations to populate the cascading selects.
 * Returns null when the client doesn't exist.
 */
export async function loadClient(clientId: number): Promise<{
  /** For the picker's own label when the client was preselected server-side. */
  name: string;
  type: string;
  contacts: Contact[];
  locations: Location[];
} | null> {
  const client = await getClient(clientId);
  if (!client) return null;
  return {
    name: client.name,
    type: client.type,
    contacts: client.contacts,
    locations: client.locations,
  };
}
