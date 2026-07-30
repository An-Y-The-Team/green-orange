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
import { Controller, Get, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { afterEach, describe, expect, test } from "bun:test";
import type { Request } from "express";
import type { JWTPayload } from "jose";
import "reflect-metadata";

import { Public } from "../common/public.decorator";
import type { PrismaService } from "../prisma/prisma.service";
import { AuthController } from "./auth.controller";
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
};
const setEnv = (key: keyof typeof env, value?: string) => {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
};
afterEach(() => {
  setEnv("AUTH_MODE", env.AUTH_MODE);
  setEnv("JWT_SECRET", env.JWT_SECRET);
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
