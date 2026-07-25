import type { JWT } from "next-auth/jwt";
import { describe, expect, it } from "vitest";

import authConfig from "./auth.config";

// The bug this guards: an expired token with nothing to refresh with used to be
// returned unflagged, so the layouts' gate saw a healthy session and let pages
// fetch with a dead token — 401s everywhere and no login prompt.
const jwt = (token: JWT) =>
  authConfig.callbacks!.jwt!({ token } as never) as Promise<JWT>;

const future = Math.floor(Date.now() / 1000) + 3600;
const past = Math.floor(Date.now() / 1000) - 1;

describe("jwt callback", () => {
  it("keeps a still-valid token as-is", async () => {
    expect(await jwt({ accessToken: "a", expiresAt: future })).toEqual({
      accessToken: "a",
      expiresAt: future,
    });
  });

  it("flags an expired token that cannot be refreshed", async () => {
    expect(await jwt({ accessToken: "a", expiresAt: past })).toMatchObject({
      error: "RefreshTokenError",
    });
  });
});
