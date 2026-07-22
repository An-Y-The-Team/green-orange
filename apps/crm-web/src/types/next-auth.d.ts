// Augment Auth.js types with the Authentik access token we forward to crm-api.
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: "RefreshTokenError";
  }
  // The headless Credentials provider returns the Authentik tokens on the user
  // object (initial sign-in passes `user`, not `account`) — see auth.config.ts.
  interface User {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    expiresAt?: number;
    refreshToken?: string;
    error?: "RefreshTokenError";
  }
}
