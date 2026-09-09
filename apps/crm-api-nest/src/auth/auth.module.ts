import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtGuard } from "./jwt.guard";
import { OidcService } from "./oidc.service";

@Module({
  imports: [
    JwtModule.register({ global: true }),
    // Generous on purpose: a worker logs in about once a month and an operator
    // once a day, so this only ever bites a loop. Applied per-route in
    // AuthController — see the note there about the proxy chain.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
  ],
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
