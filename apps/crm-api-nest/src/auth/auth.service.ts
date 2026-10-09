import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { verify } from "@node-rs/argon2";
import { createHmac } from "node:crypto";

import { normalizePhone } from "../common/phone";
import { PrismaService } from "../prisma/prisma.service";

// Matches the house pattern in crm-web's utils/http/http.ts (a named constant +
// AbortSignal.timeout). Shorter than that 30s budget: a worker is standing on
// site waiting for a login, and Zalo answers in well under a second normally.
const ZALO_FETCH_TIMEOUT_MS = 5_000;

// The mini app renders a 401 body verbatim, so this string IS the screen an
// unlisted phone sees — and it is the only screen a Zalo reviewer can reach,
// since the roster cannot be pre-seeded with a phone we do not know. It has to
// read as a deliberate gate with a way through, not as a broken app. Exported
// so the tests assert the same string the reviewer reads.
export const PHONE_NOT_ON_ROSTER =
  "Số điện thoại chưa được đăng ký. Đây là ứng dụng nội bộ của Công ty TNHH TM DV Ý Ân, chỉ dành cho nhân sự. Liên hệ 0773964407 qua Zalo để được hỗ trợ.";

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
  /**
   * The Zalo user id for an access token — the identifier the platform expects
   * a Mini App to log people in by ("Hướng dẫn sử dụng tài khoản Zalo để đăng
   * nhập"). Stable per user per Zalo App ID.
   *
   * The token goes in a HEADER, and since 01/01/2024 every profile read must
   * carry appsecret_proof = HMAC-SHA256(accessToken, appSecret). This used to
   * pass the token as a query parameter with no proof, so graph.zalo.me refused
   * every call — silently, because the only caller swallowed failures. Prod had
   * zalo_user_id null on all 4 crew rows as a result.
   */
  private async zaloProfileId(zaloAccessToken: string): Promise<string | null> {
    const secret = process.env.ZALO_APP_SECRET;
    if (!secret) return null;
    try {
      const res = await fetch("https://graph.zalo.me/v2.0/me?fields=id", {
        headers: {
          access_token: zaloAccessToken,
          appsecret_proof: createHmac("sha256", secret)
            .update(zaloAccessToken)
            .digest("hex"),
        },
        signal: AbortSignal.timeout(ZALO_FETCH_TIMEOUT_MS),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { id?: unknown };
      return typeof body?.id === "string" && body.id ? body.id : null;
    } catch {
      return null;
    }
  }

  /** Mints the 30-day crew JWT both Zalo entry points hand back. */
  private async crewSession(member: { id: number; name: string }) {
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

  /**
   * Step 1 of the platform-mandated flow: identify silently from the access
   * token alone. A Mini App may NOT show a "Đăng nhập với Zalo" button — the
   * person is already signed in to Zalo — and version 4 was rejected for doing
   * exactly that. The phone is only for linking, in zaloToken() below.
   *
   * `linked: false` is a 200, not a 401: a first-time user is an ordinary
   * state, and the mini app answers it with the onboarding screen rather than
   * an error.
   */
  async zaloIdentify(zaloAccessToken: string) {
    const zaloUserId = await this.zaloProfileId(zaloAccessToken);
    if (!zaloUserId) {
      throw new UnauthorizedException(
        "Không xác định được tài khoản Zalo, vui lòng thử lại."
      );
    }
    const member = await this.prisma.crewMember.findFirst({
      where: { zalo_user_id: zaloUserId },
    });
    if (!member || member.status === "left") return { linked: false as const };
    return { linked: true as const, ...(await this.crewSession(member)) };
  }

  private async captureZaloUserId(
    crewMemberId: number,
    zaloAccessToken: string
  ) {
    const zaloUserId = await this.zaloProfileId(zaloAccessToken);
    if (!zaloUserId) return;
    try {
      await this.prisma.crewMember.update({
        where: { id: crewMemberId },
        data: { zalo_user_id: zaloUserId },
      });
    } catch {
      // Must never fail the login: the worker is standing on site. Losing the
      // link only costs them the phone prompt once more on next open.
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
      throw new UnauthorizedException(PHONE_NOT_ON_ROSTER);
    }

    // Best-effort, and deliberately not awaited into the login path's success:
    // the only thing this id is for is letting the platform webhook act on a
    // "user.revoke.consent" event, which carries a userId and no phone. A
    // worker must still be able to clock in if Zalo is slow or this call fails.
    await this.captureZaloUserId(member.id, zaloAccessToken);

    return this.crewSession(member);
  }
}
