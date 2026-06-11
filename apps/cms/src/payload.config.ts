import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { en } from '@payloadcms/translations/languages/en'
import { vi } from '@payloadcms/translations/languages/vi'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Services } from './collections/Services'
import { Projects } from './collections/Projects'
import { Testimonials } from './collections/Testimonials'
import { ContactSubmissions } from './collections/ContactSubmissions'
import { SiteSettings } from './globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// The CMS's own public origin. Used as Payload `serverURL` so uploaded media
// `url`s are absolute (the web app reads them at depth=0 as plain strings) and
// so admin/SEO links resolve correctly. Defaults to the local dev port.
const serverURL = process.env.CMS_PUBLIC_URL || 'http://localhost:3001'

// Origins allowed to call the API from a browser (the web app's contact form
// POSTs cross-origin). Comma-separated CORS_ORIGINS in prod; defaults to the
// local web dev server. Note: localhost:3000 -> :3001 is already cross-origin.
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:3000']

export default buildConfig({
  serverURL,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Services, Projects, Testimonials, ContactSubmissions],
  globals: [SiteSettings],
  cors: corsOrigins,
  csrf: corsOrigins,
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  // Content locale: Vietnamese. Single-locale today; the structure leaves room
  // to add 'en' later without reworking the schema.
  localization: {
    locales: ['vi'],
    fallback: true,
    defaultLocale: 'vi',
  },
  // Admin panel UI language — default the interface to Vietnamese for the owner,
  // with English kept available as a switchable option.
  i18n: {
    supportedLanguages: { vi, en },
    fallbackLanguage: 'vi',
  },
  plugins: [
    // Adds a `meta` group (title, description, image) to the content collections
    // the web app renders. Site-wide defaults come from the SiteSettings global.
    seoPlugin({
      collections: ['services', 'projects'],
      uploadsCollection: 'media',
      tabbedUI: true,
    }),
  ],
})
