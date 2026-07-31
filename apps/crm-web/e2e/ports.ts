// Shared by playwright.config.ts (which boots the two servers on these ports)
// and e2e/fixtures.ts (which talks to the API directly to arrange data).
// Deliberately not 8001/3002 — see the note in playwright.config.ts.
export const API_PORT = 8011;
export const WEB_PORT = 3012;
