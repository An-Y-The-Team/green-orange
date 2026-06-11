import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { readPublishedOrAuth } from '../access/readPublishedOrAuth'

// Mirrors the web `Service` type (apps/web/src/types.ts). `slug` preserves the
// stable string id used by the web app; `order` keeps the display order that
// was implicit in the data.ts array. Drafts let editors stage content; the web
// (unauthenticated) only ever sees published docs.
export const Services: CollectionConfig = {
  slug: 'services',
  access: {
    read: readPublishedOrAuth,
    delete: isAdmin,
  },
  versions: { drafts: true },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'popular', 'order'],
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Stable id consumed by the web app (e.g. "cleaning_deep").' },
    },
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea', required: true },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Cleaning', value: 'cleaning' },
        { label: 'Construction', value: 'construction' },
      ],
    },
    { name: 'duration', type: 'text', required: true },
    {
      name: 'benefits',
      type: 'array',
      required: true,
      fields: [{ name: 'item', type: 'text', required: true }],
    },
    {
      name: 'features',
      type: 'array',
      required: true,
      fields: [{ name: 'item', type: 'text', required: true }],
    },
    {
      name: 'iconName',
      type: 'text',
      required: true,
      admin: { description: 'lucide-react icon name, e.g. "Sparkles".' },
    },
    { name: 'popular', type: 'checkbox', defaultValue: false },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Display order (ascending).' },
    },
  ],
}
