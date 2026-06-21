import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { isAuthenticated } from '../access/isAuthenticated'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: { en: 'Media', vi: 'Media' },
    plural: { en: 'Media', vi: 'Medias' },
  },
  access: {
    read: () => true,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: { en: 'Alt Text', vi: 'Văn bản thay thế' },
    },
  ],
  upload: {
    // Defaults to "<cwd>/media" (dev). In production set MEDIA_DIR to an
    // absolute path backed by a persistent volume so uploads survive deploys.
    staticDir: process.env.MEDIA_DIR || 'media',
  },
}
