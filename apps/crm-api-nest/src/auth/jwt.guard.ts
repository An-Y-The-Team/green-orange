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
import { OidcService } from "./oidc.service";

// Global guard on every route (registered as APP_GUARD). @Public() opts out.
// AUTH_MODE=local → verify our own HS256 token; oidc → verify the Authentik
// token and provision the user on first login. Same two-mode design as crm-api.
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

    try {
      if (this.mode === "oidc") {
        const payload = await this.oidc.verify(token);
        const username = this.oidc.identity(payload);
        await this.provision(username, payload.name as string | undefined);
        (req as any).user = { username };
      } else {
        const payload = await this.jwt.verifyAsync(token, {
          secret: process.env.JWT_SECRET,
        });
        (req as any).user = { username: payload.sub };
      }
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  // Create a local shadow row on first valid OIDC login (empty password).
  private async provision(username: string, fullName?: string) {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (!existing) {
      await this.prisma.user.create({
        data: { username, hashed_password: "", full_name: fullName ?? null },
      });
    }
  }
}
