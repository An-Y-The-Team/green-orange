import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(__filename);

// Standalone output + the monorepo file-tracing root are ONLY needed for the
// production Docker image. Enabling them under `next dev` makes Turbopack scan
// the entire monorepo (incl. the hoisted root node_modules) and hang, so they
// are opt-in via NEXT_OUTPUT_STANDALONE — set in the web Dockerfile build stage,
// never in local dev.
const standalone = process.env.NEXT_OUTPUT_STANDALONE === "1";

const nextConfig: NextConfig = {
  ...(standalone
    ? {
        output: "standalone" as const,
        // App is nested under apps/web; trace deps from the repo root so the
        // hoisted node_modules are bundled into the standalone output.
        outputFileTracingRoot: path.join(dirname, "../../"),
      }
    : {}),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
