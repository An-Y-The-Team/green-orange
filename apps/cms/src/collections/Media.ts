import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: { en: 'Media', vi: 'Media' },
    plural: { en: 'Media', vi: 'Medias' },
  },
  access: {
    read: () => true,
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
