import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  // Pin Turbopack's root to the monorepo root so Next doesn't infer it from a
  // stray lockfile elsewhere on the machine. `turbopack` is a top-level key in
  // Next 16 (it was previously under `experimental`).
  turbopack: {
    root: path.join(dirname, '../../'),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
