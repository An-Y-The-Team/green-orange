import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { IsString, MinLength } from "class-validator";

import { Public } from "../common/public.decorator";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";

class ZaloTokenDto {
  @IsString() @MinLength(1) token: string; // zmp-sdk getPhoneNumber() token (2-min TTL, single use)
  @IsString() @MinLength(1) access_token: string; // zmp-sdk getAccessToken()
}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Accepts application/x-www-form-urlencoded (username/password) — the OAuth2
  // password form crm-web posts. Nest's default urlencoded parser fills body.
  @Public()
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
