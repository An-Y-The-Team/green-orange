// The global APP_GUARD — the one thing between every route and an
// unauthenticated request — unit-tested with no DB, no HTTP server and no IdP
// (bun test). Fakes for PrismaService and for OidcService's network call only; a
// REAL Reflector, a REAL JwtService and a REAL OidcService.identity, since those
// are pure libraries/logic and faking them would test the fake instead of the
// metadata key and the HS256 verification that actually ship.
// What must not regress: no header / no `Bearer` / bad signature THROW 401 in
// BOTH modes (a returned `false` would be a 403 — a different bug), @Public()
// bypasses without touching jwt/prisma/oidc, `req.user` keeps the shape the
// `declare module "express"` augmentation promises downstream code, and a first
// OIDC login provisions exactly ONE shadow row even when several requests arrive
// at once.
import {
  Controller,
  Get,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { afterEach, describe, expect, test } from "bun:test";
import type { Request } from "express";
import type { JWTPayload } from "jose";
import "reflect-metadata";

import { Public } from "../common/public.decorator";
import type { PrismaService } from "../prisma/prisma.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtGuard } from "./jwt.guard";
import { OidcService } from "./oidc.service";

const SECRET = "test-secret";
const jwt = new JwtService({});

// AUTH_MODE is read in a field initializer, so it must be set BEFORE `new
// JwtGuard`; JWT_SECRET is read per verify. Both are restored between tests so
// this file can't leak a mode into another.
const env = {
  AUTH_MODE: process.env.AUTH_MODE,
  JWT_SECRET: process.env.JWT_SECRET,
  ZALO_APP_SECRET: process.env.ZALO_APP_SECRET,
};
const setEnv = (key: keyof typeof env, value?: string) => {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
};
afterEach(() => {
  setEnv("AUTH_MODE", env.AUTH_MODE);
  setEnv("JWT_SECRET", env.JWT_SECRET);
  setEnv("ZALO_APP_SECRET", env.ZALO_APP_SECRET);
});

// Touching one of these is a failure, not a fallback: local mode must never
// provision a row, and oidc mode must never fall back to our own HS256 verifier.
const forbidden = (name: string): any =>
  new Proxy(
    {},
    {
      get: () => {
        throw new Error(`${name} must not be reached on this path`);
      },
    }
  );

// A minimal ExecutionContext: the guard only uses getHandler/getClass (for the
// Reflector) and switchToHttp().getRequest(). `route` defaults to metadata-free
// targets, i.e. an ordinary protected route.
const ctx = (
  authorization?: string,
  route: { handler?: unknown; cls?: unknown } = {}
) => {
  const req = {
    headers: authorization === undefined ? {} : { authorization },
  } as Request;
  const context = {
    getHandler: () => route.handler ?? (() => undefined),
    getClass: () => route.cls ?? class Plain {},
    switchToHttp: () => ({ getRequest: () => req }),
  } as any;
  return { context, req };
};

// A guard has two ways to say no and they are not interchangeable: throwing
// UnauthorizedException is the 401 the client (and crm-web's session handling)
// expects, `return false` becomes a 403.
const denied = async (act: Promise<boolean>) => {
  const outcome = await act.then(
    (value) => `resolved to ${value}`,
    (error: unknown) => error
  );
  expect(outcome).toBeInstanceOf(UnauthorizedException);
  expect((outcome as UnauthorizedException).getStatus()).toBe(401);
};

const localGuard = () => {
  setEnv("AUTH_MODE", "local");
  setEnv("JWT_SECRET", SECRET);
  return new JwtGuard(
    new Reflector(),
    jwt,
    forbidden("prisma"),
    forbidden("oidc")
  );
};

// Only the network hop (verify) is stubbed — `identity()` stays production code,
// so the precedence that decides WHICH row gets provisioned is the real one.
const oidcGuard = (
  payload: JWTPayload | Error,
  prisma: PrismaService = forbidden("prisma")
) => {
  setEnv("AUTH_MODE", "oidc");
  setEnv("JWT_SECRET", undefined); // oidc mode must not need our own secret
  const oidc = new OidcService();
  oidc.verify = async () => {
    if (payload instanceof Error) throw payload;
    return payload;
  };
  return new JwtGuard(new Reflector(), forbidden("jwt"), prisma, oidc);
};

// The `user` table with its UNIQUE(username) index. `create` is kept even though
// the guard now upserts: it is what makes a find-then-create regression fail here
// (a duplicate insert is a P2002, not a second row). `upsert` is one statement
// (Postgres INSERT … ON CONFLICT) so it cannot interleave with a concurrent login
// — the fake models that by doing its work synchronously.
type Row = {
  id: number;
  username: string;
  hashed_password: string;
  full_name: string | null;
};
const fakeUsers = (seed: Partial<Row>[] = []) => {
  const rows: Row[] = seed.map((u, i) => ({
    id: i + 1,
    username: "seed",
    hashed_password: "",
    full_name: null,
    ...u,
  }));
  const creates: Record<string, unknown>[] = [];
  const insert = (data: any): Row => {
    creates.push(data);
    const row = { id: rows.length + 1, ...data } as Row;
    rows.push(row);
    return row;
  };
  const prisma = {
    user: {
      findUnique: async ({ where }: any) =>
        rows.find((r) => r.username === where.username) ?? null,
      create: async ({ data }: any) => {
        if (rows.some((r) => r.username === data.username)) {
          throw Object.assign(
            new Error("Unique constraint failed on the fields: (`username`)"),
            { code: "P2002" }
          );
        }
        return insert(data);
      },
      upsert: async ({ where, create }: any) =>
        rows.find((r) => r.username === where.username) ?? insert(create),
    },
  } as unknown as PrismaService;
  return { prisma, rows, creates };
};

describe("JwtGuard: @Public() bypass", () => {
  // The login route 401-ing itself is unrecoverable — no token can be obtained
  // without it. This reads the REAL decorator off the REAL controller, so
  // dropping @Public() (or renaming IS_PUBLIC_KEY on one side only) fails here.
  test("POST /auth/token is public: no header needed, nothing else consulted", async () => {
    const guard = localGuard();
    const { context } = ctx(undefined, {
      handler: AuthController.prototype.token,
      cls: AuthController,
    });
    expect(await guard.canActivate(context)).toBe(true);
  });

  test("a public route does not get a req.user", async () => {
    const guard = localGuard();
    const { context, req } = ctx(undefined, {
      handler: AuthController.prototype.token,
      cls: AuthController,
    });
    await guard.canActivate(context);
    expect(req.user).toBeUndefined();
  });

  test("GET /auth/me on the same controller is NOT public", async () => {
    const guard = localGuard();
    const { context } = ctx(undefined, {
      handler: AuthController.prototype.me,
      cls: AuthController,
    });
    await denied(guard.canActivate(context));
  });

  // getAllAndOverride checks the class too; nothing in src uses it that way yet,
  // so this is the only thing pinning that half of the call.
  test("@Public() on the class covers its undecorated methods", async () => {
    @Public()
    @Controller("open")
    class OpenController {
      @Get()
      anything() {}
    }
    const guard = localGuard();
    const { context } = ctx(undefined, {
      handler: OpenController.prototype.anything,
      cls: OpenController,
    });
    expect(await guard.canActivate(context)).toBe(true);
  });

  // A bogus token on a public route must not turn a 200 into a 401.
  test("a garbage token on a public route is ignored, not verified", async () => {
    const guard = localGuard();
    const { context } = ctx("Bearer not-a-jwt", {
      handler: AuthController.prototype.token,
      cls: AuthController,
    });
    expect(await guard.canActivate(context)).toBe(true);
  });
});

describe("JwtGuard: Authorization header", () => {
  test("no header at all → 401", async () => {
    await denied(localGuard().canActivate(ctx(undefined).context));
  });

  test("empty header → 401", async () => {
    await denied(localGuard().canActivate(ctx("").context));
  });

  test("no Bearer prefix (bare token) → 401", async () => {
    const token = await jwt.signAsync({ sub: "alice" }, { secret: SECRET });
    await denied(localGuard().canActivate(ctx(token).context));
  });

  test("a different scheme → 401", async () => {
    await denied(localGuard().canActivate(ctx("Basic YWxpY2U6cHc=").context));
  });

  test("Bearer with no token → 401", async () => {
    await denied(localGuard().canActivate(ctx("Bearer").context));
  });

  test("Bearer with an empty token → 401", async () => {
    await denied(localGuard().canActivate(ctx("Bearer ").context));
  });

  // Deliberately strict: the scheme is compared case-sensitively. crm-web sends
  // "Bearer", so this only rejects hand-rolled clients — kept as-is rather than
  // loosening a security check for RFC 7235's case-insensitive scheme rule.
  test("lowercase `bearer` → 401 (documented strictness)", async () => {
    const token = await jwt.signAsync({ sub: "alice" }, { secret: SECRET });
    await denied(localGuard().canActivate(ctx(`bearer ${token}`).context));
  });

  test("the header check runs in oidc mode too", async () => {
    await denied(oidcGuard({ sub: "x" }).canActivate(ctx(undefined).context));
  });
});

describe("JwtGuard: local mode (HS256)", () => {
  // JWT_SECRET is read per verify, so the guard always runs with the real one —
  // the failure cases differ in the TOKEN, which is how an attacker's does.
  const activate = (token: string) => {
    const guard = localGuard();
    const { context, req } = ctx(`Bearer ${token}`);
    return { ok: guard.canActivate(context), req };
  };

  test("a valid token passes and sets req.user = { username: sub }", async () => {
    const token = await jwt.signAsync({ sub: "alice" }, { secret: SECRET });
    const { ok, req } = activate(token);
    expect(await ok).toBe(true);
    // The exact shape the express augmentation promises — CurrentUser() reads
    // req.user.username and nothing else may sneak in.
    expect(req.user).toEqual({ username: "alice" });
  });

  test("a token signed with a different secret → 401", async () => {
    const token = await jwt.signAsync({ sub: "alice" }, { secret: "other" });
    const { ok, req } = activate(token);
    await denied(ok);
    expect(req.user).toBeUndefined();
  });

  test("an expired token → 401", async () => {
    const token = await jwt.signAsync(
      { sub: "alice" },
      { secret: SECRET, expiresIn: "-1s" }
    );
    await denied(activate(token).ok);
  });

  test("a non-JWT string → 401", async () => {
    await denied(activate("not-a-jwt").ok);
  });

  test("a tampered payload (re-encoded claims) → 401", async () => {
    const token = await jwt.signAsync({ sub: "alice" }, { secret: SECRET });
    const [header, , signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "admin" })).toString(
      "base64url"
    );
    await denied(activate(`${header}.${forged}.${signature}`).ok);
  });

  // The classic bypass: an unsigned `alg: none` token against a deployment that
  // forgot JWT_SECRET. jsonwebtoken refuses unsigned tokens unless "none" is
  // explicitly allowed, and this pins that we never pass such an option.
  test("an unsigned alg:none token → 401 even with JWT_SECRET unset", async () => {
    const b64 = (o: unknown) =>
      Buffer.from(JSON.stringify(o)).toString("base64url");
    const unsigned = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "admin" })}.`;
    setEnv("AUTH_MODE", "local");
    const guard = new JwtGuard(
      new Reflector(),
      jwt,
      forbidden("prisma"),
      forbidden("oidc")
    );
    setEnv("JWT_SECRET", undefined);
    await denied(guard.canActivate(ctx(`Bearer ${unsigned}`).context));
  });

  // `forbidden("prisma")`/`forbidden("oidc")` throw on any property access, so
  // this passing at all is the assertion: a local-mode request writes nothing
  // and calls no IdP.
  test("local mode touches neither the DB nor the IdP", async () => {
    const token = await jwt.signAsync({ sub: "alice" }, { secret: SECRET });
    expect(await activate(token).ok).toBe(true);
  });

  // Documented gap, not an endorsement: our own signer always sets `sub`, so
  // reaching this needs JWT_SECRET already. See the report — a one-line
  // `if (!payload.sub) throw` would close it.
  test("a valid token with no sub still passes, with username undefined", async () => {
    const token = await jwt.signAsync({ role: "admin" }, { secret: SECRET });
    const { ok, req } = activate(token);
    expect(await ok).toBe(true);
    expect(req.user).toEqual({ username: undefined });
  });
});

describe("JwtGuard: oidc mode (Authentik)", () => {
  const login = (payload: JWTPayload | Error, prisma?: PrismaService) => {
    const { context, req } = ctx("Bearer authentik-token");
    return { ok: oidcGuard(payload, prisma).canActivate(context), req };
  };

  test("a token the IdP rejects → 401", async () => {
    const { ok, req } = login(new UnauthorizedException("bad token"));
    await denied(ok);
    expect(req.user).toBeUndefined();
  });

  test("a non-401 verify failure (JWKS unreachable) is also a 401", async () => {
    await denied(login(new TypeError("fetch failed")).ok);
  });

  test("a valid token passes and sets req.user = { username: identity }", async () => {
    const db = fakeUsers();
    const { ok, req } = login(
      { sub: "uuid-1", preferred_username: "kim", email: "kim@x.vn" },
      db.prisma
    );
    expect(await ok).toBe(true);
    expect(req.user).toEqual({ username: "kim" });
  });

  // Mode confusion: an Authentik token must not be handed to our HS256 verifier
  // (and vice versa). `forbidden("jwt")` throws if it is.
  test("oidc mode never falls back to the local HS256 verifier", async () => {
    const db = fakeUsers();
    expect(await login({ preferred_username: "kim" }, db.prisma).ok).toBe(true);
  });

  // Fail closed: if provisioning blows up the request must not be let through.
  test("a DB failure during provisioning → 401, not an authenticated request", async () => {
    const prisma = {
      user: {
        upsert: async () => {
          throw new Error("connection refused");
        },
        findUnique: async () => {
          throw new Error("connection refused");
        },
      },
    } as unknown as PrismaService;
    const { ok, req } = login({ preferred_username: "kim" }, prisma);
    await denied(ok);
    expect(req.user).toBeUndefined();
  });

  // Documented gap, not an endorsement: a verified token carrying no identity
  // claim at all is accepted as the shared username "unknown". See the report.
  test("a verified token with no identity claim logs in as `unknown`", async () => {
    const db = fakeUsers();
    const { ok, req } = login({ iat: 1 }, db.prisma);
    expect(await ok).toBe(true);
    expect(req.user).toEqual({ username: "unknown" });
    expect(db.creates).toEqual([
      { username: "unknown", hashed_password: "", full_name: null },
    ]);
  });
});

describe("JwtGuard: oidc provisioning happens exactly once", () => {
  const token = "Bearer authentik-token";
  const kim: JWTPayload = {
    sub: "uuid-1",
    preferred_username: "kim",
    name: "Kim Lê",
  };

  test("first login creates the shadow row (empty password, name copied)", async () => {
    const db = fakeUsers();
    const guard = oidcGuard(kim, db.prisma);
    expect(await guard.canActivate(ctx(token).context)).toBe(true);
    expect(db.creates).toEqual([
      { username: "kim", hashed_password: "", full_name: "Kim Lê" },
    ]);
  });

  test("a second login with the same identity creates nothing", async () => {
    const db = fakeUsers();
    const guard = oidcGuard(kim, db.prisma);
    expect(await guard.canActivate(ctx(token).context)).toBe(true);
    expect(await guard.canActivate(ctx(token).context)).toBe(true);
    expect(db.creates).toHaveLength(1);
    expect(db.rows).toHaveLength(1);
  });

  // The real first login: crm-web renders a page as several parallel requests, so
  // they all arrive before any row exists. find-then-create loses that race —
  // every insert but one hits UNIQUE(username), gets swallowed by the guard's
  // catch, and the user's first page load 401s.
  test("several simultaneous first logins → one row, and all of them pass", async () => {
    const db = fakeUsers();
    const guard = oidcGuard(kim, db.prisma);
    const results = await Promise.all([
      guard.canActivate(ctx(token).context),
      guard.canActivate(ctx(token).context),
      guard.canActivate(ctx(token).context),
    ]);
    expect(results).toEqual([true, true, true]);
    expect(db.creates).toHaveLength(1);
    expect(db.rows).toHaveLength(1);
  });

  test("two different identities get a row each", async () => {
    const db = fakeUsers();
    await oidcGuard(kim, db.prisma).canActivate(ctx(token).context);
    await oidcGuard({ preferred_username: "an" }, db.prisma).canActivate(
      ctx(token).context
    );
    expect(db.rows.map((r) => r.username)).toEqual(["kim", "an"]);
  });

  // An SSO login by someone who already has a local account must not blank their
  // password or overwrite their name.
  test("an existing account is left untouched", async () => {
    const db = fakeUsers([
      {
        username: "kim",
        hashed_password: "$argon2id$hash",
        full_name: "Kim Lê",
      },
    ]);
    const guard = oidcGuard(
      { preferred_username: "kim", name: "Someone Else" },
      db.prisma
    );
    expect(await guard.canActivate(ctx(token).context)).toBe(true);
    expect(db.creates).toEqual([]);
    expect(db.rows[0]).toEqual({
      id: 1,
      username: "kim",
      hashed_password: "$argon2id$hash",
      full_name: "Kim Lê",
    });
  });
});

// Which claim becomes the username decides which row gets provisioned and what
// every audit trail says, so the precedence is pinned here.
describe("OidcService.identity", () => {
  const identity = (payload: JWTPayload) => new OidcService().identity(payload);

  test("preferred_username wins", () => {
    expect(
      identity({ preferred_username: "kim", email: "kim@x.vn", sub: "uuid-1" })
    ).toBe("kim");
  });

  test("falls back to email", () => {
    expect(identity({ email: "kim@x.vn", sub: "uuid-1" })).toBe("kim@x.vn");
  });

  test("then to sub", () => {
    expect(identity({ sub: "uuid-1" })).toBe("uuid-1");
  });

  // `||` not `??`: Authentik sending an empty preferred_username must not
  // provision a row with an empty username.
  test("an empty claim falls through instead of winning", () => {
    expect(identity({ preferred_username: "", email: "kim@x.vn" })).toBe(
      "kim@x.vn"
    );
  });

  test("nothing usable → the shared `unknown` (documented gap)", () => {
    expect(identity({})).toBe("unknown");
  });
});

// POST /auth/token is @Public(), so this check is the only thing standing
// between an empty form post and the password verifier.
describe("AuthController.token input guard", () => {
  const controller = () => new AuthController(forbidden("auth"));

  test("missing password → 401 without reaching the service", () => {
    expect(() => controller().token({ username: "kim" })).toThrow(
      UnauthorizedException
    );
  });

  test("missing username → 401", () => {
    expect(() => controller().token({ password: "pw" })).toThrow(
      UnauthorizedException
    );
  });

  test("an empty body → 401, not a crash", () => {
    expect(() => controller().token({})).toThrow(UnauthorizedException);
  });

  test("an empty-string password is not a credential", () => {
    expect(() => controller().token({ username: "kim", password: "" })).toThrow(
      UnauthorizedException
    );
  });

  test("both present → delegates to the service", async () => {
    const calls: string[][] = [];
    const auth = {
      token: async (username: string, password: string) => {
        calls.push([username, password]);
        return { access_token: "t", token_type: "bearer" };
      },
    } as any;
    await new AuthController(auth).token({ username: "kim", password: "pw" });
    expect(calls).toEqual([["kim", "pw"]]);
  });
});

// The mini app's only door. Everything here is a refusal path: the phone number
// arrives from Zalo, not from the client, so the ONLY thing that decides whether
// a worker gets a token is (a) Zalo confirming the number and (b) that number
// already being on the roster. A silent widening of either — a non-200 treated
// as success, an unnormalizable number falling through, a `left` member still
// matching — hands a crew token to someone who never worked here.
describe("AuthService.zaloToken", () => {
  const SECRET_KEY = "zalo-app-secret";
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  // Only Zalo's Open API hop is faked. normalizePhone, the roster lookup and the
  // signing stay production code — faking those would test the fake.
  const service = (
    zalo: { ok?: boolean; body?: unknown } | Error,
    members: { id: number; name: string; phone: string; status: string }[] = []
  ) => {
    setEnv("ZALO_APP_SECRET", SECRET_KEY);
    setEnv("JWT_SECRET", SECRET);
    const calls: { headers: Record<string, string> }[] = [];
    globalThis.fetch = (async (_url: string, init: any) => {
      calls.push({ headers: init?.headers ?? {} });
      if (zalo instanceof Error) throw zalo;
      return {
        ok: zalo.ok ?? true,
        json: async () => zalo.body,
      };
    }) as unknown as typeof fetch;
    const prisma = {
      crewMember: {
        findUnique: async ({ where }: any) =>
          members.find((m) => m.phone === where.phone) ?? null,
      },
    } as unknown as PrismaService;
    return { auth: new AuthService(prisma, jwt), calls };
  };

  const kim = { id: 7, name: "Kim Lê", phone: "0912345678", status: "working" };
  const ok = { body: { data: { number: "84912345678" }, error: 0 } };

  const refused = async (act: Promise<unknown>, message?: string) => {
    const outcome = await act.then(
      (value) => `resolved to ${JSON.stringify(value)}`,
      (error: unknown) => error
    );
    expect(outcome).toBeInstanceOf(UnauthorizedException);
    if (message !== undefined) {
      expect((outcome as UnauthorizedException).message).toBe(message);
    }
  };

  test("a roster match mints a crew token, not a CRM one", async () => {
    const { auth } = service(ok, [kim]);
    const result = await auth.zaloToken("phone-token", "zalo-access-token");
    expect(result.token_type).toBe("bearer");
    expect(result.crew_member).toEqual({ id: 7, name: "Kim Lê" });
    // kind:"crew" is what jwt.guard.ts keys the @Worker()-only boundary on;
    // losing it would make this token look like an operator's.
    expect(jwt.verify(result.access_token, { secret: SECRET })).toMatchObject({
      sub: "crew:7",
      kind: "crew",
      crew_member_id: 7,
    });
  });

  // The app secret must never leave the server, and the pair is sent as HEADERS
  // (not query params) — Zalo's /me/info reads access_token/code/secret_key there.
  test("the exchange sends the pair plus the app secret as headers", async () => {
    const { auth, calls } = service(ok, [kim]);
    await auth.zaloToken("phone-token", "zalo-access-token");
    expect(calls).toHaveLength(1);
    expect(calls[0].headers).toEqual({
      access_token: "zalo-access-token",
      code: "phone-token",
      secret_key: SECRET_KEY,
    });
  });

  test("no ZALO_APP_SECRET → 500, never a token", async () => {
    const { auth } = service(ok, [kim]);
    setEnv("ZALO_APP_SECRET", undefined);
    await expect(auth.zaloToken("t", "a")).rejects.toBeInstanceOf(
      InternalServerErrorException
    );
  });

  test("Zalo rejecting the code (non-200) → 401", async () => {
    const { auth } = service({ ok: false, body: { error: -201 } }, [kim]);
    await refused(auth.zaloToken("expired-token", "a"));
  });

  // A single-use token reused after its 2 minutes comes back 200 with an error
  // body and no number — the status code alone is not the check.
  test("a 200 with no data.number → 401", async () => {
    const { auth } = service({ body: { error: -201, message: "invalid" } }, [
      kim,
    ]);
    await refused(auth.zaloToken("reused-token", "a"));
  });

  test("the network hop failing → 401, not a 500", async () => {
    const { auth } = service(new TypeError("fetch failed"), [kim]);
    await refused(auth.zaloToken("t", "a"));
  });

  test("a number normalizePhone cannot read → 401", async () => {
    const { auth } = service({ body: { data: { number: "12345" } } }, [kim]);
    await refused(auth.zaloToken("t", "a"));
  });

  // The roster IS the allowlist: an unknown number gets the message the mini app
  // shows verbatim, so a worker knows to call the office rather than retry.
  test("a number nobody on the roster has → 401 with the Vietnamese reason", async () => {
    const { auth } = service(ok, []);
    await refused(
      auth.zaloToken("t", "a"),
      "Số điện thoại chưa được đăng ký với công ty"
    );
  });

  test("a member who has left can no longer log in", async () => {
    const { auth } = service(ok, [{ ...kim, status: "left" }]);
    await refused(
      auth.zaloToken("t", "a"),
      "Số điện thoại chưa được đăng ký với công ty"
    );
  });

  test("on_leave is not left: they can still log time", async () => {
    const { auth } = service(ok, [{ ...kim, status: "on_leave" }]);
    expect((await auth.zaloToken("t", "a")).crew_member.id).toBe(7);
  });

  // Zalo returns the 84-prefixed form; the roster stores the local 0… form.
  // If these two ever disagree every login refuses as "not registered".
  test("the 84… number Zalo returns matches the 0… number on the roster", async () => {
    const { auth } = service({ body: { data: { number: "84912345678" } } }, [
      kim,
    ]);
    expect((await auth.zaloToken("t", "a")).crew_member.id).toBe(7);
  });
});
