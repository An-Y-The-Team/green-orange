import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { verify } from "@node-rs/argon2";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  // OAuth2 password grant (AUTH_MODE=local). Argon2-verify then mint an HS256
  // token with sub=username, matching the Python backend's /auth/token.
  async token(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    const bad = new UnauthorizedException("Incorrect username or password");
    if (!user || user.disabled || !user.hashed_password) throw bad;
    if (!(await verify(user.hashed_password, password))) throw bad;

    const minutes = Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES ?? 30);
    const access_token = await this.jwt.signAsync(
      { sub: username },
      { secret: process.env.JWT_SECRET, expiresIn: `${minutes}m` }
    );
    return { access_token, token_type: "bearer" };
  }

  async me(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new UnauthorizedException();
    return { id: user.id, username: user.username, full_name: user.full_name };
  }
}
