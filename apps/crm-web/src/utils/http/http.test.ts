import { afterEach, describe, expect, it, vi } from "vitest";

// Both are read at module load, so they must be set before the import: API_URL
// pins the base URL, and CRM_API_TOKEN short-circuits the local token mint so the
// stubbed fetch below only ever sees the request under test.
process.env.CRM_API_URL = "http://api.test";
process.env.CRM_API_TOKEN = "t";
const { ApiError, apiFetch, apiFetchSafe } = await import("./http");

// The bug this guards: apiFetchSafe used to catch EVERYTHING and return the
// fallback, so a dead backend rendered as an empty list — /projects answered
// HTTP 200 with [] while nothing was up.
const stubStatus = (status: number, body = "{}") =>
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(body, { status })))
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetchSafe", () => {
  it("degrades a 501 to the fallback", async () => {
    stubStatus(501);
    await expect(apiFetchSafe("/crew", [])).resolves.toEqual([]);
  });

  it("rethrows a 500 instead of masking it as no records", async () => {
    stubStatus(500);
    await expect(apiFetchSafe("/projects", [])).rejects.toBeInstanceOf(
      ApiError
    );
  });

  it("rethrows a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("fetch failed")))
    );
    await expect(apiFetchSafe("/projects", [])).rejects.toThrow("fetch failed");
  });

  it("passes a 200 through", async () => {
    stubStatus(200, JSON.stringify([{ id: 1 }]));
    await expect(apiFetchSafe("/projects", [])).resolves.toEqual([{ id: 1 }]);
  });
});

describe("apiFetch", () => {
  it("throws an ApiError whose status is readable without parsing the message", async () => {
    stubStatus(503);
    await expect(apiFetch("/projects")).rejects.toMatchObject({ status: 503 });
  });

  // The bug this guards: reads went through @yan/shared/api's wrapper, which
  // THROWS on a non-2xx instead of returning the Response — so fetchWithAuth's
  // `res.status === 401` branches never ran for a read. An expired local dev
  // token could not re-mint, and the read failed instead of self-healing.
  // `canRemint()` and `getBearer()` both read env per call, so dropping
  // CRM_API_TOKEN here reaches the auto-mint path without a fresh import.
  it("re-mints the dev token and retries once on a 401", async () => {
    const token = process.env.CRM_API_TOKEN;
    delete process.env.CRM_API_TOKEN;
    const calls: string[] = [];
    // 401 on the FIRST read only; the retry (after a re-mint) succeeds.
    let reads = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        calls.push(`${init?.method ?? "GET"} ${new URL(url).pathname}`);
        if (url.endsWith("/auth/token")) {
          return Promise.resolve(
            new Response(JSON.stringify({ access_token: "minted" }), {
              status: 200,
            })
          );
        }
        reads += 1;
        return Promise.resolve(
          reads === 1
            ? new Response("{}", { status: 401 })
            : new Response(JSON.stringify([{ id: 7 }]), { status: 200 })
        );
      })
    );

    await expect(apiFetch("/projects")).resolves.toEqual([{ id: 7 }]);
    // Mint → 401 → re-mint → retry. Without the fix the first 401 threw instead.
    expect(calls).toEqual([
      "POST /auth/token",
      "GET /projects",
      "POST /auth/token",
      "GET /projects",
    ]);

    if (token !== undefined) process.env.CRM_API_TOKEN = token;
  });

  it("gives up after one retry rather than looping on a persistent 401", async () => {
    const token = process.env.CRM_API_TOKEN;
    delete process.env.CRM_API_TOKEN;
    let reads = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/auth/token")) {
          return Promise.resolve(
            new Response(JSON.stringify({ access_token: "minted" }), {
              status: 200,
            })
          );
        }
        reads += 1;
        return Promise.resolve(new Response("{}", { status: 401 }));
      })
    );

    await expect(apiFetch("/projects")).rejects.toMatchObject({ status: 401 });
    expect(reads).toBe(2);

    if (token !== undefined) process.env.CRM_API_TOKEN = token;
  });
});
