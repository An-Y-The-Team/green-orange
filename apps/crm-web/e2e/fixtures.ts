import {
  type APIRequestContext,
  type Page,
  test as base,
  expect,
} from "@playwright/test";

import { ProjectStage } from "@/app/(dashboard)/projects/enums";
import { QuoteChannel } from "@/app/(dashboard)/quotes/enums";
import {
  MilestoneStatus,
  MilestoneType,
} from "@/app/(dashboard)/receivables/enums";

import { API_PORT } from "./ports";

/**
 * Arrange via the API, act via the UI.
 *
 * The flow specs assert business rules that only exist once several entities
 * interact, and most of them write. Driving the *setup* through the API instead
 * of the UI is what makes them re-runnable and parallel-safe: each one gets its
 * own công trình, so nothing depends on a re-seed or on another spec's order.
 * The rule under test is always exercised through the UI.
 */

const API_URL = `http://localhost:${API_PORT}`;

// Seeded rows every flow builds on (apps/crm-api-nest/src/seed.ts, stable ids).
// Location 1 belongs to client 1 — the API rejects a mismatched pair.
const CLIENT_ID = 1;
const LOCATION_ID = 1;
const TYPE_ID = 1;

export type ProjectRow = { id: number; code: string; stage: string };
export type QuoteRow = { id: number; version: number };

export type Api = {
  createProject(opts?: {
    stage?: ProjectStage;
    name?: string;
  }): Promise<ProjectRow>;
  createQuote(projectId: number, amount: number): Promise<QuoteRow>;
  sendQuote(quoteId: number): Promise<void>;
  createMilestone(opts: {
    projectId: number;
    amount: number;
    dueDate: string;
    type?: MilestoneType;
    status?: MilestoneStatus;
  }): Promise<{ id: number }>;
};

/** `n` days from today as YYYY-MM-DD, in the browser's (= the app's) timezone. */
export function isoDay(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "2026-07-31" → "31/07/2026" — what DateInput accepts and displays. */
export function displayDay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * The stage rail renders twice — a mobile pill and a desktop row, both in the
 * DOM, only one visible at any viewport. Every stepper button lookup has to
 * filter on visibility or it resolves to two elements.
 */
export const stepperButton = (page: Page, name: string | RegExp) =>
  page.getByRole("button", { name }).filter({ visible: true });

let counter = 0;
/** Unique per worker AND per run, so re-runs never collide on a name. */
const uniqueName = (label: string) => `E2E ${label} ${Date.now()}-${counter++}`;

function makeApi(request: APIRequestContext): Api {
  let token: string | undefined;

  const headers = async () => {
    if (!token) {
      // AUTH_MODE=local — the same password grant crm-web itself mints with.
      const res = await request.post(`${API_URL}/auth/token`, {
        form: { username: "admin", password: "admin" },
      });
      expect(
        res.ok(),
        "could not mint an API token — is the API in AUTH_MODE=local?"
      ).toBe(true);
      token = ((await res.json()) as { access_token: string }).access_token;
    }
    return { Authorization: `Bearer ${token}` };
  };

  const post = async (path: string, data: unknown, retriesOn409 = 0) => {
    for (let attempt = 0; ; attempt++) {
      const res = await request.post(`${API_URL}${path}`, {
        headers: await headers(),
        data,
      });
      const body = await res.text();
      if (res.ok()) return body ? JSON.parse(body) : undefined;
      if (res.status() !== 409 || attempt >= retriesOn409) {
        expect(res.ok(), `POST ${path} → ${res.status()} ${body}`).toBe(true);
      }
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }
  };

  return {
    // ponytail: retried, not fixed here. POST /projects derives its code from
    // `max(id) + 1` (crm-api-nest common/code.ts `nextCode`) outside any lock,
    // so two creates in the same instant produce the same CT-YYYY-NNN and one
    // loses on the unique index — a real 409 two operators can hit, which the
    // parallel workers here reproduce every run. Drop the retry once the code
    // comes from a sequence or a retrying transaction.
    createProject: ({ stage = ProjectStage.REQUEST, name } = {}) =>
      post(
        "/projects",
        {
          name: name ?? uniqueName(stage),
          client_id: CLIENT_ID,
          location_id: LOCATION_ID,
          type_ids: [TYPE_ID],
          stage,
        },
        5
      ),

    createQuote: (projectId, amount) =>
      post("/quotes", {
        project_id: projectId,
        items: [
          { description: "Vệ sinh kính", quantity: 1, unit_price: amount },
        ],
      }),

    // A draft quote has no decision buttons — the client has to have seen it.
    sendQuote: async (quoteId) => {
      await post(`/quotes/${quoteId}/send`, {
        channel: QuoteChannel.ZALO,
        sent_by: "e2e",
      });
    },

    createMilestone: ({
      projectId,
      amount,
      dueDate,
      type = MilestoneType.PROGRESS,
      status = MilestoneStatus.AWAITING_PAYMENT,
    }) =>
      post("/payment-milestones", {
        project_id: projectId,
        type,
        amount,
        status,
        due_date: dueDate,
      }),
  };
}

export const test = base.extend<{ api: Api }>({
  // Playwright calls this second argument `use`; named `provide` here because
  // eslint reads any `use…()` call as a React hook.
  api: async ({ request }, provide) => {
    await provide(makeApi(request));
  },
});

export { expect };
