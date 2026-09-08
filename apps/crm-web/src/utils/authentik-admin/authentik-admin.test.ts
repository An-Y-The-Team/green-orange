import { afterEach, beforeEach, expect, test, vi } from "vitest";

// The gate reads env at module load, so every case re-imports a fresh module.
const authMock = vi.fn<() => Promise<{ accessToken?: string } | null>>();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

const fetchMock =
  vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

const ISSUER = "https://auth.example.com/application/o/green-orange/";

/** Unsigned RS256-shaped token whose payload carries `sub`. */
function tokenFor(sub: string) {
  const b64 = (s: string) => Buffer.from(s).toString("base64url");
  return `${b64('{"alg":"RS256"}')}.${b64(JSON.stringify({ sub }))}.sig`;
}

function authentikAnswers(user: { is_superuser: boolean; groups: string[] }) {
  // A fresh Response per call — a body can only be read once.
  fetchMock.mockImplementation(async () =>
    Response.json({
      results: [
        {
          is_superuser: user.is_superuser,
          groups_obj: user.groups.map((name) => ({ name })),
        },
      ],
    })
  );
}

async function load() {
  vi.resetModules();
  return import("./authentik-admin");
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("AUTH_AUTHENTIK_ISSUER", ISSUER);
  vi.stubEnv("AUTHENTIK_ADMIN_TOKEN", "svc-token");
  authMock.mockResolvedValue({ accessToken: tokenFor("thuky") });
});

afterEach(() => {
  fetchMock.mockReset();
  authMock.mockReset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test("no admin token → page disabled, gate closed, network untouched", async () => {
  vi.stubEnv("AUTHENTIK_ADMIN_TOKEN", undefined);
  const mod = await load();

  expect(mod.usersEnabled).toBe(false);
  await expect(mod.isUserAdmin()).resolves.toBe(false);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("no session → denied without asking Authentik", async () => {
  authMock.mockResolvedValue(null);
  const mod = await load();

  await expect(mod.isUserAdmin()).resolves.toBe(false);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("a plain member is denied; the lookup is by the token's sub on the public origin", async () => {
  authentikAnswers({ is_superuser: false, groups: ["staff"] });
  const mod = await load();

  await expect(mod.isUserAdmin()).resolves.toBe(false);
  await expect(mod.requireUserAdmin()).rejects.toBeInstanceOf(
    mod.ForbiddenError
  );
  const [url, init] = fetchMock.mock.calls[0]!;
  expect(String(url)).toBe(
    "https://auth.example.com/api/v3/core/users/?username=thuky"
  );
  expect((init?.headers as Record<string, string>).Authorization).toBe(
    "Bearer svc-token"
  );
});

test("a crm-admins member is allowed", async () => {
  authentikAnswers({ is_superuser: false, groups: ["staff", "crm-admins"] });
  const mod = await load();

  await expect(mod.isUserAdmin()).resolves.toBe(true);
  await expect(mod.requireUserAdmin()).resolves.toBeUndefined();
});

test("a superuser is allowed even outside the group", async () => {
  authentikAnswers({ is_superuser: true, groups: [] });
  const mod = await load();

  await expect(mod.isUserAdmin()).resolves.toBe(true);
});

test("Authentik failing or an unknown user closes the gate instead of throwing", async () => {
  fetchMock.mockResolvedValueOnce(new Response("down", { status: 502 }));
  const mod = await load();
  await expect(mod.isUserAdmin()).resolves.toBe(false);

  fetchMock.mockResolvedValueOnce(Response.json({ results: [] }));
  await expect(mod.isUserAdmin()).resolves.toBe(false);
});

test("akFetch surfaces Authentik's own complaint as the backend message", async () => {
  fetchMock.mockResolvedValueOnce(
    Response.json(
      { non_field_errors: ["Recovery flow not applicable to user"] },
      { status: 400 }
    )
  );
  const mod = await load();

  await expect(
    mod.akFetch("/core/users/1/recovery/", { method: "POST" })
  ).rejects.toMatchObject({
    status: 400,
    backendMessage: "Recovery flow not applicable to user",
  });
});
