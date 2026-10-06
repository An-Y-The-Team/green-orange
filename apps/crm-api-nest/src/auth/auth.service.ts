import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { verify } from "@node-rs/argon2";

import { normalizePhone } from "../common/phone";
import { PrismaService } from "../prisma/prisma.service";

// Matches the house pattern in crm-web's utils/http/http.ts (a named constant +
// AbortSignal.timeout). Shorter than that 30s budget: a worker is standing on
// site waiting for a login, and Zalo answers in well under a second normally.
const ZALO_FETCH_TIMEOUT_MS = 5_000;

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

  /**
   * Records the per-app Zalo user id against the crew member, so a later
   * `user.revoke.consent` webhook can be matched to a roster row (that event
   * carries only `userId` — see src/zalo/zalo.module.ts).
   *
   * Swallows every failure on purpose: this is bookkeeping for a webhook that
   * may never fire, and it must never cost a worker their login. Worst case the
   * column stays null and a revocation is logged for the office to handle.
   *
   * ⚠️ Assumes `graph.zalo.me/v2.0/me` returns the SAME per-app id the webhook
   * sends. Verify against one real revocation before trusting the automatic
   * path — if the ids differ, the webhook's fallback logging still catches it.
   */
  private async captureZaloUserId(
    crewMemberId: number,
    zaloAccessToken: string
  ) {
    try {
      const res = await fetch(
        `https://graph.zalo.me/v2.0/me?access_token=${encodeURIComponent(zaloAccessToken)}&fields=id`,
        { signal: AbortSignal.timeout(ZALO_FETCH_TIMEOUT_MS) }
      );
      if (!res.ok) return;
      const body = (await res.json()) as { id?: unknown };
      if (typeof body?.id !== "string" || !body.id) return;
      await this.prisma.crewMember.update({
        where: { id: crewMemberId },
        data: { zalo_user_id: body.id },
      });
    } catch {
      // Already covered by the doc comment: never fails a login.
    }
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
        // Bounded, because this route is @Public() and now internet-reachable:
        // without it each request holds an outbound connection to Zalo for as
        // long as Zalo takes, so a loop exhausts sockets here and hammers Zalo
        // with our app secret attached. The catch below already turns a failure
        // into the right Vietnamese 401 — it simply never fired.
        signal: AbortSignal.timeout(ZALO_FETCH_TIMEOUT_MS),
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
        "Số điện thoại chưa được đăng ký với công ty. Báo văn phòng để được thêm vào danh sách."
      );
    }

    // Best-effort, and deliberately not awaited into the login path's success:
    // the only thing this id is for is letting the platform webhook act on a
    // "user.revoke.consent" event, which carries a userId and no phone. A
    // worker must still be able to clock in if Zalo is slow or this call fails.
    await this.captureZaloUserId(member.id, zaloAccessToken);

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
