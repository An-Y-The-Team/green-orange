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
});
