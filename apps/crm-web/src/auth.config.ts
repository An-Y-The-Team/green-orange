import type { NextAuthConfig } from "next-auth";
import { CredentialsSignin } from "next-auth";
import Authentik from "next-auth/providers/authentik";
import Credentials from "next-auth/providers/credentials";

import { headlessLogin } from "@/lib/authentik-flow";

// Surfaces the headless-login failure reason to the client as `res.code`
// ("invalid_credentials" | "unsupported_stage" | "error") so the overlay can
// tell "wrong password" apart from "this account needs the hosted login".
class HeadlessLoginError extends CredentialsSignin {
  constructor(code: string) {
    super();
    this.code = code;
  }
}

// Auth is OPT-IN: only enforced when Authentik is configured. With no
// AUTH_AUTHENTIK_ISSUER (the default for local/mock dev), the dashboard stays
// open and no login is required — matches the team topology where daily work
// runs in AUTH_MODE=local and Authentik is only used for the SSO milestone.
const issuer = process.env.AUTH_AUTHENTIK_ISSUER;
export const authEnabled = Boolean(issuer);

// Authentik's token endpoint is GLOBAL (/application/o/token/), not under the
// per-app issuer path — the discovery doc confirms it, and the slug-scoped URL
// answers 405. Building it from the issuer's origin keeps refresh working.
const tokenEndpoint = issuer
  ? `${new URL(issuer).origin}/application/o/token/`
  : "";

// Edge-safe config shared by the Node route handler and the edge middleware
// (no DB adapter — JWT sessions only — so it runs in middleware fine).
export default {
  providers: authEnabled
    ? [
        Authentik({
          clientId: process.env.AUTH_AUTHENTIK_ID,
          clientSecret: process.env.AUTH_AUTHENTIK_SECRET,
          issuer,
          // offline_access → refresh token; the others map to the claims the
          // crm-api verifier reads (preferred_username / email).
          authorization: {
            params: { scope: "openid email profile offline_access" },
          },
        }),
        // Inline (headless) login: credentials are driven through Authentik's
        // flow executor server-side, ending in the SAME code exchange as the
        // redirect flow — crm-api sees an identical RS256 token. Hosted /login
        // (the Authentik provider above) stays as the fallback for MFA etc.
        Credentials({
          credentials: { username: {}, password: {} },
          async authorize(creds) {
            const username = creds?.username;
            const password = creds?.password;
            if (typeof username !== "string" || typeof password !== "string") {
              throw new HeadlessLoginError("invalid_credentials");
            }
            const result = await headlessLogin(username, password);
            if (!result.ok) throw new HeadlessLoginError(result.reason);
            return {
              id: username,
              name: username,
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              expiresAt: result.expiresAt,
            };
          },
        }),
      ]
    : [],
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth }) {
      if (!authEnabled) return true; // local/mock dev: no gate
      return Boolean(auth?.user);
    },
    async jwt({ token, account, user }) {
      // Initial sign-in via the headless credentials path: the tokens ride on
      // `user`. Must run before the account block — a credentials `account`
      // carries no tokens and would blank them.
      if (user?.accessToken) {
        return {
          ...token,
          accessToken: user.accessToken,
          expiresAt: user.expiresAt,
          refreshToken: user.refreshToken,
        };
      }
      // Initial sign-in via the redirect flow: stash the Authentik tokens.
      if (account?.access_token) {
        return {
          ...token,
          accessToken: account.access_token,
          expiresAt: account.expires_at,
          refreshToken: account.refresh_token,
        };
      }
      // Still valid → reuse.
      if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
        return token;
      }
      // Expired → refresh against Authentik's token endpoint.
      if (!token.refreshToken || !tokenEndpoint) return token;
      try {
        const res = await fetch(tokenEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: token.refreshToken,
            client_id: process.env.AUTH_AUTHENTIK_ID ?? "",
            client_secret: process.env.AUTH_AUTHENTIK_SECRET ?? "",
          }),
        });
        const refreshed = await res.json();
        if (!res.ok) throw refreshed;
        return {
          ...token,
          accessToken: refreshed.access_token,
          expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
          refreshToken: refreshed.refresh_token ?? token.refreshToken,
        };
      } catch {
        return { ...token, error: "RefreshTokenError" };
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
} satisfies NextAuthConfig;
