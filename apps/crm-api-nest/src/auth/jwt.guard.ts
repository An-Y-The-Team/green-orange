import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

import { IS_PUBLIC_KEY } from "../common/public.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { IS_WORKER_KEY } from "./crew.decorator";
import { OidcService } from "./oidc.service";

// The guard is the only thing that sets `req.user`, so declare it here rather
// than casting at each assignment — a cast would have to be repeated and would
// hide a shape change from the compiler.
declare module "express" {
  interface Request {
    user?: { username: string } | { kind: "crew"; crew_member_id: number };
  }
}

// Global guard on every route (registered as APP_GUARD). @Public() opts out.
// AUTH_MODE=local → verify our own HS256 token; oidc → verify the Authentik
// token and provision the user on first login. Same two-mode design as crm-api.
//
// Two token populations, strictly separated:
//   CRM users  — HS256 { sub: username } (local) or Authentik RS256 (oidc)
//   crew       — HS256 { kind: "crew", crew_member_id }, minted by
//                /auth/zalo-token, ALWAYS verified with JWT_SECRET regardless
//                of AUTH_MODE (so prod-oidc still needs JWT_SECRET set)
// @Worker() routes accept only crew tokens; every other route rejects them —
// a crew token must never unlock the CRM (in oidc mode the HS256/RS256
// algorithm mismatch already denies it, the explicit check covers local mode).
@Injectable()
export class JwtGuard implements CanActivate {
  private readonly mode = (process.env.AUTH_MODE ?? "local").toLowerCase();

  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly oidc: OidcService
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const [type, token] = req.headers.authorization?.split(" ") ?? [];
    if (type !== "Bearer" || !token) throw new UnauthorizedException();

    const isWorker = this.reflector.getAllAndOverride<boolean>(IS_WORKER_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    try {
      if (isWorker) {
        const payload = await this.jwt.verifyAsync(token, {
          secret: process.env.JWT_SECRET,
        });
        if (
          payload.kind !== "crew" ||
          typeof payload.crew_member_id !== "number"
        ) {
          throw new Error("not a crew token");
        }
        req.user = { kind: "crew", crew_member_id: payload.crew_member_id };
      } else if (this.mode === "oidc") {
        const payload = await this.oidc.verify(token);
        const username = this.oidc.identity(payload);
        await this.provision(username, payload.name as string | undefined);
        req.user = { username };
      } else {
        const payload = await this.jwt.verifyAsync(token, {
          secret: process.env.JWT_SECRET,
        });
        if (payload.kind === "crew") throw new Error("crew token on CRM route");
        req.user = { username: payload.sub };
      }
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  // Create a local shadow row on first valid OIDC login (empty password).
  // upsert (one INSERT … ON CONFLICT), not find-then-create: a page load fires
  // several requests at once, so the FIRST login races itself — every request
  // sees no row, they all insert, and the losers hit the UNIQUE(username) index,
  // get swallowed by the catch above and come back as a spurious 401.
  // `update: {}` leaves an existing row alone — an SSO login must never blank the
  // password or rename a user who already has a local account.
  private provision(username: string, fullName?: string) {
    return this.prisma.user.upsert({
      where: { username },
      create: { username, hashed_password: "", full_name: fullName ?? null },
      update: {},
    });
  }
}
