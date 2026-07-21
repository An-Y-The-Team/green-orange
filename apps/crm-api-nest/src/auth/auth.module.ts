import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtGuard } from "./jwt.guard";
import { OidcService } from "./oidc.service";

@Module({
  imports: [JwtModule.register({ global: true })],
  controllers: [AuthController],
  providers: [
    AuthService,
    OidcService,
    // Global bearer guard for the whole app; @Public() routes opt out.
    { provide: APP_GUARD, useClass: JwtGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
