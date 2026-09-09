import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { IsString, MinLength } from "class-validator";

import { Public } from "../common/public.decorator";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";

class ZaloTokenDto {
  @IsString() @MinLength(1) token: string; // zmp-sdk getPhoneNumber() token (2-min TTL, single use)
  @IsString() @MinLength(1) access_token: string; // zmp-sdk getAccessToken()
}

/**
 * Throttled here, not globally: a global ThrottlerGuard would also meter the
 * operator's own traffic, and the chấm công grid refetches a week after every
 * cell save. Only the two @Public() routes below need it — they are the whole
 * unauthenticated surface of an API this release publishes to the internet.
 * (GET /auth/me is guarded and called by neither client.)
 *
 * ponytail: TLS terminates at the Pangolin edge and Caddy is a second hop, so
 * without a verified X-Forwarded-For chain this meters Caddy's container IP —
 * one bucket for everyone rather than one per client. Deliberate: legitimate
 * zalo-token volume is about one request per worker per 30 days, so a shared
 * cap never bites a real user, whereas a mis-set `trust proxy` would let one
 * attacker drain a per-IP bucket and lock out every worker. Key it per IP once
 * XFF is confirmed in prod.
 */
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Accepts application/x-www-form-urlencoded (username/password) — the OAuth2
  // password form crm-web posts. Nest's default urlencoded parser fills body.
  @Public()
  @UseGuards(ThrottlerGuard)
  @Post("token")
  @HttpCode(200)
  token(@Body() body: { username?: string; password?: string }) {
    if (!body?.username || !body?.password) {
      throw new UnauthorizedException("Missing credentials");
    }
    return this.auth.token(body.username, body.password);
  }

  // Zalo mini-app login — converts the phone-number token pair into a crew JWT.
  @Public()
  @UseGuards(ThrottlerGuard)
  @Post("zalo-token")
  @HttpCode(200)
  zaloToken(@Body() dto: ZaloTokenDto) {
    return this.auth.zaloToken(dto.token, dto.access_token);
  }

  @Get("me")
  me(@CurrentUser() username: string) {
    return this.auth.me(username);
  }
}
