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
  test: { server: { deps: { inline: ["next-auth"] } } },
});
