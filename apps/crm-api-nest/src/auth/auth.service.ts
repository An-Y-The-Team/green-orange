import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { verify } from "@node-rs/argon2";

import { normalizePhone } from "../common/phone";
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

  // Zalo mini-app login. The app sends the zmp-sdk getPhoneNumber() token plus
  // the user's Zalo access token; Zalo's Open API converts the pair into the
  // real phone number (server-side only — needs the app secret). The number
  // must match a pre-registered CrewMember or login is refused. Crew tokens
  // are long-lived (workers must not re-consent daily) and only ever unlock
  // @Worker() routes — see jwt.guard.ts.
  async zaloToken(token: string, zaloAccessToken: string) {
    const secret = process.env.ZALO_APP_SECRET;
    if (!secret) {
      throw new InternalServerErrorException("ZALO_APP_SECRET not configured");
    }

    const failed = new UnauthorizedException(
      "Đăng nhập Zalo thất bại, vui lòng thử lại"
    );
    let number: string | undefined;
    try {
      const res = await fetch("https://graph.zalo.me/v2.0/me/info", {
        headers: {
          access_token: zaloAccessToken,
          code: token,
          secret_key: secret,
        },
      });
      if (!res.ok) throw failed;
      const body = (await res.json()) as { data?: { number?: string } };
      number = body?.data?.number;
    } catch {
      throw failed;
    }

    const phone = normalizePhone(number);
    if (!phone) throw failed;

    const member = await this.prisma.crewMember.findUnique({
      where: { phone },
    });
    if (!member || member.status === "left") {
      throw new UnauthorizedException(
        "Số điện thoại chưa được đăng ký với công ty"
      );
    }

    const access_token = await this.jwt.signAsync(
      { sub: `crew:${member.id}`, kind: "crew", crew_member_id: member.id },
      { secret: process.env.JWT_SECRET, expiresIn: "30d" }
    );
    return {
      access_token,
      token_type: "bearer",
      crew_member: { id: member.id, name: member.name },
    };
  }
}
