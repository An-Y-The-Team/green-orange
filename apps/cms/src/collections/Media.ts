import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    // Defaults to "<cwd>/media" (dev). In production set MEDIA_DIR to an
    // absolute path backed by a persistent volume so uploads survive deploys.
    staticDir: process.env.MEDIA_DIR || 'media',
  },
}
