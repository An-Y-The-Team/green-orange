import type { JWT } from "next-auth/jwt";
import { afterEach, describe, expect, it, vi } from "vitest";

// The refresh path only exists when Authentik is configured, and the config reads
// the issuer at module load — so stub it before importing, or every test below
// falls through the "nothing to refresh with" branch and proves nothing.
process.env.AUTH_AUTHENTIK_ISSUER = "https://idp.test/application/o/crm/";
const { default: authConfig } = await import("./auth.config");

// The bug this guards: an expired token with nothing to refresh with used to be
// returned unflagged, so the layouts' gate saw a healthy session and let pages
// fetch with a dead token — 401s everywhere and no login prompt.
const jwt = (token: JWT) =>
  authConfig.callbacks!.jwt!({ token } as never) as Promise<JWT>;

const future = Math.floor(Date.now() / 1000) + 3600;
const past = Math.floor(Date.now() / 1000) - 1;

// Stands in for Authentik's token endpoint so a refresh attempt is observable
// without leaving the process.
const stubTokenEndpoint = () => {
  const fetchMock = vi.fn(() =>
    Promise.resolve(Response.json({}, { status: 400 }))
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it("never retries a refresh once the session is flagged dead", async () => {
    const fetchMock = stubTokenEndpoint();
    const dead: JWT = {
      accessToken: "a",
      expiresAt: past,
      refreshToken: "r",
      error: "RefreshTokenError",
    };
    expect(await jwt(dead)).toEqual(dead);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still attempts a refresh for an expired token that is not flagged", async () => {
    const fetchMock = stubTokenEndpoint();
    expect(
      await jwt({ accessToken: "a", expiresAt: past, refreshToken: "r" })
    ).toMatchObject({ error: "RefreshTokenError" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
