import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UnauthorizedException,
} from "@nestjs/common";

import { Public } from "../common/public.decorator";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";

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

  @Get("me")
  me(@CurrentUser() username: string) {
    return this.auth.me(username);
  }
}
