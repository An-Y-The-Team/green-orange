import type { NextAuthConfig } from "next-auth";
import Authentik from "next-auth/providers/authentik";

// Auth is OPT-IN: only enforced when Authentik is configured. With no
// AUTH_AUTHENTIK_ISSUER (the default for local/mock dev), the dashboard stays
// open and no login is required — matches the team topology where daily work
// runs in AUTH_MODE=local and Authentik is only used for the SSO milestone.
const issuer = process.env.AUTH_AUTHENTIK_ISSUER;
export const authEnabled = Boolean(issuer);

const tokenEndpoint = issuer ? `${issuer.replace(/\/$/, "")}/token/` : "";

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
      ]
    : [],
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth }) {
      if (!authEnabled) return true; // local/mock dev: no gate
      return Boolean(auth?.user);
    },
    async jwt({ token, account }) {
      // Initial sign-in: stash the Authentik tokens.
      if (account) {
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
