import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(__filename);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // Pin Turbopack's root to the monorepo root so Next doesn't infer it from a
  // stray lockfile elsewhere on the machine. `turbopack` is a top-level key in
  // Next 16 (it was previously under `experimental`).
  turbopack: {
    root: path.join(dirname, "../../"),
  },
};
export default nextConfig;
