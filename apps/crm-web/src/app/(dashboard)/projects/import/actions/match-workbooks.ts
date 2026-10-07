"use server";

import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";
import { batchProcess } from "@yan/shared/utils";

import { getClient } from "@/app/(dashboard)/clients/queries";
import type { Client } from "@/app/(dashboard)/clients/types";
import { INVALID_INPUT_MESSAGE } from "@/constants/server-action";
import { apiFetchSafe, toActionError } from "@/utils/http/http";

import { listProjectTypes } from "../../queries";
import type { Project, ProjectType } from "../../types";
import type { WorkbookMatch } from "../types";
import {
  duplicateCodes,
  pickClient,
  pickContact,
  pickLocation,
  pickTypes,
} from "../utils/match-workbook/match-workbook";

// Only the fields matching reads — they end up in query strings, nothing else.
const requestSchema = z
  .array(
    z.object({
      key: z.string().min(1),
      /** undefined = match automatically; null = the operator chose "new"; id = their pick. */
      clientId: z.number().int().positive().nullable().optional(),
      workbook: z.object({
        project: z.object({
          name: z.string(),
          type_names: z.array(z.string()),
          site_address: z.string(),
        }),
        client: z.object({
          name: z.string(),
          tax_code: z.string().optional(),
        }),
        contact: z
          .object({ name: z.string(), phone: z.string().optional() })
          .nullable(),
      }),
    })
  )
  .min(1);

export type MatchRequest = z.infer<typeof requestSchema>[number];

export type MatchOutcome =
  | { key: string; match: WorkbookMatch }
  | { key: string; error: string };

// A lookup window, not the table: a matching MST or exact name is in the
// first page or it is not there (GET /clients searches name AND MST).
const LOOKUP_LIMIT = 20;

/**
 * Read-only: what each parsed workbook would attach to. Nothing is written —
 * the operator reviews this before anything is created.
 */
export async function matchWorkbooks(
  input: MatchRequest[]
): Promise<ServerActionState<MatchOutcome[]>> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: INVALID_INPUT_MESSAGE };

  const types = await listProjectTypes();
  const outcomes: MatchOutcome[] = [];
  // A few lookups per file; four files at a time keeps the API unhurried.
  await batchProcess(
    parsed.data,
    async (request, index) => {
      try {
        outcomes[index] = {
          key: request.key,
          match: await matchOne({ request, types }),
        };
      } catch (error) {
        // Never guess "new client" when the lookup itself failed — that is how
        // duplicates get made. The card says so and the file stays blocked.
        outcomes[index] = {
          key: request.key,
          error: toActionError(error, "Không kiểm tra được khách hàng có sẵn."),
        };
      }
    },
    4
  );
  return { success: true, data: outcomes };
}

async function matchOne({
  request,
  types,
}: {
  request: MatchRequest;
  types: ProjectType[];
}): Promise<WorkbookMatch> {
  const { workbook, clientId } = request;
  const { ids, unmatched } = pickTypes({
    types,
    names: workbook.project.type_names,
  });

  const client =
    clientId === null
      ? null
      : clientId !== undefined
        ? { id: clientId }
        : await findClient(workbook.client);
  const detail = client ? await getClient(client.id) : undefined;
  if (!detail)
    return {
      client: null,
      location: null,
      contact: null,
      type_ids: ids,
      unmatched_types: unmatched,
      duplicates: [],
    };

  const location = pickLocation({
    locations: detail.locations ?? [],
    address: workbook.project.site_address,
  });
  const contact = workbook.contact
    ? pickContact({
        contacts: detail.contacts ?? [],
        contact: workbook.contact,
      })
    : null;
  const sameName = await apiFetchSafe<Project[]>(
    `/projects?client_id=${detail.id}&search=${encodeURIComponent(workbook.project.name)}&limit=${LOOKUP_LIMIT}`,
    []
  );

  return {
    client: { id: detail.id, name: detail.name },
    location: location ? { id: location.id, name: location.name } : null,
    contact: contact ? { id: contact.id, name: contact.name } : null,
    type_ids: ids,
    unmatched_types: unmatched,
    duplicates: duplicateCodes({
      projects: sameName,
      name: workbook.project.name,
    }),
  };
}

async function findClient(
  client: MatchRequest["workbook"]["client"]
): Promise<Client | null> {
  const search = async (q: string) =>
    apiFetchSafe<Client[]>(
      `/clients?search=${encodeURIComponent(q)}&limit=${LOOKUP_LIMIT}`,
      []
    );
  const byTax = client.tax_code
    ? pickClient({ candidates: await search(client.tax_code), client })
    : null;
  if (byTax) return byTax;
  return client.name
    ? pickClient({ candidates: await search(client.name), client })
    : null;
}
