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

// Allow <Image> to load media uploaded to the CMS. Derived from the public CMS
// URL so it works across local dev (http://localhost:8055) and prod
// (https://cms.example.com) without hardcoding the host.
const cmsUrl = process.env.NEXT_PUBLIC_CMS_URL || "http://localhost:8055";
const cms = new URL(cmsUrl);
const cmsRemotePattern = {
  protocol: cms.protocol.replace(":", "") as "http" | "https",
  hostname: cms.hostname,
  ...(cms.port ? { port: cms.port } : {}),
};

const nextConfig: NextConfig = {
  // Workspace packages ship raw TS/TSX (see their package.json "exports"); Next
  // must transpile them rather than expect prebuilt JS.
  transpilePackages: ["@yan/ui", "@yan/shared"],
  experimental: {
    multiZoneDraftMode: true,
  },
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
      cmsRemotePattern,
    ],
  },
  // Allow the Directus Studio to embed the site in an iframe for the Visual
  // Editor. Must list the CMS origin in `frame-ancestors`; otherwise the
  // browser blocks the framed preview. Mirrors the CMS-side CSP
  // (CONTENT_SECURITY_POLICY_DIRECTIVES__FRAME_ANCESTORS).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${cmsUrl}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
