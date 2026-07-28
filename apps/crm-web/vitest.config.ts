import { defineConfig } from "vitest/config";

// Only here so tests can import app modules: `@/` path alias, plus the explicit
// `next/server` extension node's resolver wants when next-auth is loaded outside
// the Next runtime.
export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./src/", import.meta.url).pathname,
      "next/server": "next/server.js",
    },
  },
  // TZ is set suite-wide: the date utils are only wrong in a UTC+ zone, so a
  // test running under UTC cannot catch the bug it guards.
  test: {
    env: { TZ: "Asia/Ho_Chi_Minh" },
    server: { deps: { inline: ["next-auth"] } },
  },
});
