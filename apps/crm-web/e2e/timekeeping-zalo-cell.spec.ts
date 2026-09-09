import { displayDay, expect, isoDay, test } from "./fixtures";
import { API_PORT } from "./ports";

/**
 * The chấm công grid commits on blur, and its no-op guard used to compare only
 * against the MANUAL row. On a cell whose only row came from the Zalo app there
 * is no manual row, so the guard could not fire: merely tabbing across the week
 * POSTed `source: "manual"`, which is born `approved` and then wins over the
 * Zalo row forever via manual-precedence.
 *
 * The damage was silent and total — an unreviewed claim became approved công
 * without `POST /timekeeping/:id/decide`, an already-approved day was quietly
 * reattributed to hand entry, and for a shift still open the approved `0` beat
 * the real hours even after the operator later duyệt-ed them.
 *
 * It cannot be caught below this level: the bug is the blur event meeting a
 * server action, and `apps/crm-web/vitest.config.ts` collects only
 * `src/**\/*.test.ts` (no jsdom, no @testing-library), so there is no component
 * test to put it in. `baseline-hours.test.ts` pins the comparison; this pins the
 * wiring.
 *
 * Asserts against the seeded dataset (`apps/crm-api-nest/src/seed.ts`): row 6 is
 * a `pending` zalo_app row for crew member 1 on day(-1) of project 2. `bun run
 * test:e2e` re-seeds first, which is the baseline these specs are built on.
 */

const API_URL = `http://localhost:${API_PORT}`;
const SEEDED_PROJECT_ID = 2;
const SEEDED_PROJECT_CODE = "CT-2026-002";
const SEEDED_MEMBER_ID = 1;
const SEEDED_MEMBER_NAME = "Trần Quốc Bảo";
// Seed row 6 — the pending claim. day(-1) is inside the grid's default week
// (it opens on mondayOfThisWeek), so no navigation is needed to reach the cell.
const CLAIM_DAY = isoDay(-1);

test("tabbing through a pending Zalo cell writes no manual row", async ({
  page,
  request,
}) => {
  const minted = await request.post(`${API_URL}/auth/token`, {
    form: { username: "admin", password: "admin" },
  });
  expect(
    minted.ok(),
    "could not mint an API token — is the API in AUTH_MODE=local?"
  ).toBeTruthy();
  const { access_token } = (await minted.json()) as { access_token: string };
  const headers = { Authorization: `Bearer ${access_token}` };

  // The assertion has to be made against the database, not the screen: the bug
  // wrote a row that looked identical to what was already displayed.
  const manualRowCount = async () => {
    const res = await request.get(
      `${API_URL}/timekeeping?project_id=${SEEDED_PROJECT_ID}&from=${CLAIM_DAY}&to=${CLAIM_DAY}&limit=500`,
      { headers }
    );
    const rows = (await res.json()) as {
      source: string;
      crew_member_id: number;
    }[];
    return rows.filter(
      (r) => r.source === "manual" && r.crew_member_id === SEEDED_MEMBER_ID
    ).length;
  };

  expect(
    await manualRowCount(),
    "seed baseline: the claim day has no manual row"
  ).toBe(0);

  await page.goto("/crew?tab=timekeeping");
  await page.getByPlaceholder("Tìm công trình theo mã, tên…").click();
  await page
    .getByPlaceholder("Tìm công trình theo mã, tên…")
    .fill(SEEDED_PROJECT_CODE);
  await page
    .getByRole("option")
    .filter({ hasText: SEEDED_PROJECT_CODE })
    .first()
    .click();

  const cell = page.getByLabel(
    new RegExp(`${SEEDED_MEMBER_NAME}.*${displayDay(CLAIM_DAY)}`)
  );
  await expect(cell).toBeVisible();
  // The claim is displayed, per crm-ui-02-timekeeping-grid.md — the number is
  // the Zalo row's, and the chip beside it says it is not approved.
  await expect(cell).toHaveValue("9");

  // The regression: focus, then leave. Nothing typed, so nothing may be written.
  await cell.focus();
  await cell.blur();
  await page.waitForTimeout(1500);

  expect(
    await manualRowCount(),
    "an untouched blur must not create a manual row"
  ).toBe(0);

  // …and the documented override must still work: typing a DIFFERENT value
  // creates the manual row on purpose.
  await cell.fill("7");
  await cell.blur();
  await expect
    .poll(manualRowCount, { message: "typing a new value still overrides" })
    .toBe(1);

  // Clean up so the spec is re-runnable against the shared seed.
  const res = await request.get(
    `${API_URL}/timekeeping?project_id=${SEEDED_PROJECT_ID}&from=${CLAIM_DAY}&to=${CLAIM_DAY}&limit=500`,
    { headers }
  );
  const rows = (await res.json()) as {
    id: number;
    source: string;
    crew_member_id: number;
  }[];
  for (const row of rows.filter(
    (r) => r.source === "manual" && r.crew_member_id === SEEDED_MEMBER_ID
  )) {
    await request.delete(`${API_URL}/timekeeping/${row.id}`, { headers });
  }
});
