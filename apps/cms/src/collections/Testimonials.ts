import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { readPublishedOrAuth } from '../access/readPublishedOrAuth'
import { resolveMediaUrl } from '../hooks/resolveMediaUrl'

// Mirrors the web `Testimonial` type (apps/web/src/types.ts). Unlike Services
// and Projects, testimonials may target both service lines, so `category`
// includes the "both" option. The owner can upload an avatar (preferred) or
// paste an external URL; the hook mirrors the uploaded URL into `avatarUrl`.
export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  access: {
    read: readPublishedOrAuth,
    delete: isAdmin,
  },
  versions: { drafts: true },
  admin: {
    useAsTitle: 'author',
    defaultColumns: ['author', 'company', 'category', 'rating', 'order'],
  },
  hooks: {
    beforeValidate: [
      async ({ data, req }) => {
        if (!data) return data
        const uploadedAvatar = await resolveMediaUrl(req, data.avatar)
        if (uploadedAvatar) data.avatarUrl = uploadedAvatar
        return data
      },
    ],
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Stable id consumed by the web app (e.g. "testi_1").' },
    },
    { name: 'author', type: 'text', required: true },
    { name: 'role', type: 'text', required: true },
    { name: 'company', type: 'text', required: true },
    { name: 'content', type: 'textarea', required: true },
    { name: 'rating', type: 'number', required: true, min: 0, max: 5 },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Upload the author photo. Fills the avatar URL below automatically.' },
    },
    {
      name: 'avatarUrl',
      type: 'text',
      required: true,
      admin: {
        description: 'Auto-filled from the uploaded avatar above, or paste an external URL.',
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Cleaning', value: 'cleaning' },
        { label: 'Construction', value: 'construction' },
        { label: 'Both', value: 'both' },
      ],
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Display order (ascending).' },
    },
  ],
}
