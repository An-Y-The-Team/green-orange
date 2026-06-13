import NextAuth from "next-auth";

import authConfig from "@/auth.config";

// Full Auth.js instance (Node runtime — route handler, server components, server
// actions). The edge middleware uses authConfig directly. See auth.config.ts.
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
