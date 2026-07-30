import type { Contact, Location } from "../../../clients/types";

export type ClientOption = { id: number; name: string };

/** The contacts/locations of the selected client, driving the cascading selects. */
export type ClientDetail = {
  type: string;
  contacts: Contact[];
  locations: Location[];
};

/** Repeat business — /projects/new?from=<project> pre-selects the same parties. */
export type Prefill = {
  client_id: number;
  location_id: number;
  working_contact_id: number;
  decision_maker_contact_id: number;
};

/**
 * What the inline quick-create hands back. `contact`/`location` are only present
 * for companies — for an individual the backend derives both from the address,
 * so the parent re-selects the client instead.
 */
export type QuickCreateResult = {
  client: ClientOption;
  type: string;
  contact?: Contact;
  location?: Location;
};

/**
 * Imperative handle on the quick-create block so the intake form can save a
 * filled-but-unsaved client on its own submit. Resolves to whether a client was
 * created (`false` = its own validation/API errors are now on screen).
 */
export type QuickCreateHandle = { submit: () => Promise<boolean> };
