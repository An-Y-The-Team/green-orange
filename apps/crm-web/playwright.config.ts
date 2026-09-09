import { defineConfig, devices } from "@playwright/test";

import { API_PORT, WEB_PORT } from "./e2e/ports";

/**
 * E2E against a REAL stack. There is no mock mode: every read happens in a
 * server component through `CRM_API_URL` (server-only), so `page.route()` never
 * sees it — a browser cannot intercept an SSR fetch. The suite therefore boots
 * crm-api-nest + Postgres and asserts against the seeded demo dataset.
 *
 * Run:  bun run test:e2e   (from apps/crm-web — builds + seeds first)
 */

// Dedicated ports (e2e/ports.ts). The everyday dev stack (:8001 API, :3002 web)
// is usually running with Authentik/OIDC on, which would bounce every test to
// /login and blocks the API's local /auth/token mint. E2E brings up its own pair
// in AUTH_MODE=local instead, so both stacks can be up at the same time.
const API_URL = `http://localhost:${API_PORT}`;

// The same `crm_nest` database the dev stack uses. `bun run seed` upserts on
// stable ids, so re-seeding before a run restores the baseline these specs
// assert on instead of needing a private database.
// ponytail: shared DB — point DATABASE_URL at a `crm_e2e` database if the rows
// these tests create start getting in the way of dev work.
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:password@localhost:5432/crm_nest";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Retried everywhere, not just CI. Under the full suite (fully parallel, one
  // web server + API + database) a server action's RESPONSE is occasionally
  // aborted client-side: the request logs `200` and the row is written, then the
  // browser reports net::ERR_ABORTED for that POST, so the revalidated tree
  // never lands and the panel keeps rendering pre-write data. It hit a
  // different write-heavy spec roughly every other run. Not reproducible with
  // one spec run 5× in parallel, not a slow server (a probe on the heaviest page
  // stayed under 1s throughout a failing run), and unaffected by blocking
  // Next's prefetches or by closing the confirm dialog on success instead of on
  // click — i.e. a router race under load, not something the spec can await.
  // Playwright still reports the retried test as flaky, so this stays visible.
  retries: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  // 10s, not the 5s default: almost every assertion here follows a write
  // (server action → API → revalidatePath → re-render), and with the suite
  // fully parallel on one server+API+database a single round-trip was measured
  // at just over 5s under load — which surfaced as "element not found" on a
  // different spec each run. This is an assertion *budget*, not a sleep.
  expect: { timeout: 10000 },
  use: { baseURL: `http://localhost:${WEB_PORT}`, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // `node`, not `bun run start`: Bun would load apps/crm-api-nest/.env, and
      // whatever AUTH_MODE that file happens to hold would decide whether these
      // tests can talk to the API at all. Node reads no .env, so the block below
      // is the whole environment.
      command: "node dist/main",
      cwd: "../crm-api-nest",
      url: `${API_URL}/health`,
      env: {
        PORT: String(API_PORT),
        DATABASE_URL,
        AUTH_MODE: "local",
        JWT_SECRET: process.env.JWT_SECRET ?? "e2e-only",
        CORS_ORIGINS: `http://localhost:${WEB_PORT}`,
      },
      // Never reuse: a server left on this port from an earlier run answers
      // /health perfectly well while pointing at a different database, and the
      // suite then passes against the wrong data. Failing with "port in use" is
      // the better outcome.
      reuseExistingServer: false,
    },
    {
      command: `bunx next start --port ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}`,
      env: {
        CRM_API_URL: API_URL,
        // Auth OFF (AUTH_ENABLED is `Boolean(AUTH_AUTHENTIK_ISSUER)`), so no
        // login flow to script. Set to empty rather than left alone: .env holds a
        // real issuer, and Next only skips a .env key that is ALREADY in the
        // environment — so setting it here is what actually turns auth off.
        AUTH_AUTHENTIK_ISSUER: "",
      },
      // Never reuse: a server left on this port from an earlier run answers
      // /health perfectly well while pointing at a different database, and the
      // suite then passes against the wrong data. Failing with "port in use" is
      // the better outcome.
      reuseExistingServer: false,
    },
  ],
});
