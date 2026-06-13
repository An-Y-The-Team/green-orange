import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(__filename);

// Standalone output + monorepo file-tracing root are only needed for the
// production Docker image; enabling them under `next dev` makes Turbopack scan
// the whole monorepo and hang. Opt in via NEXT_OUTPUT_STANDALONE (set in the
// Dockerfile build stage), never in local dev. Mirrors apps/web.
const standalone = process.env.NEXT_OUTPUT_STANDALONE === "1";

const nextConfig: NextConfig = {
  // Workspace packages ship raw TS/TSX (see their package.json "exports").
  transpilePackages: ["@yan/ui", "@yan/shared"],
  ...(standalone
    ? {
        output: "standalone" as const,
        outputFileTracingRoot: path.join(dirname, "../../"),
      }
    : {}),
};

export default nextConfig;
