import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
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

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Origins allowed to call the API from a browser (the web app's contact form
// POSTs cross-origin). Comma-separated CORS_ORIGINS in prod; defaults to the
// local web dev server. Note: localhost:3000 -> :3001 is already cross-origin.
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:3000']

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Services, Projects, Testimonials, ContactSubmissions],
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
  localization: {
    locales: ['en'],
    fallback: true,
    defaultLocale: 'en',
  },
})
