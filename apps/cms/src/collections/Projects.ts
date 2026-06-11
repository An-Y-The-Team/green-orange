import type { CollectionConfig } from 'payload'

import { resolveMediaUrl } from '../hooks/resolveMediaUrl'

// Mirrors the web `Project` type (apps/web/src/types.ts), including the optional
// embedded `testimonial` group. The web reads `imageUrl`/`avatarUrl` as plain
// string URLs at depth=0; the owner can either upload an image (preferred) or
// paste an external URL. The `beforeValidate` hook mirrors any uploaded media's
// absolute URL into the string field so the web contract is unchanged.
export const Projects: CollectionConfig = {
  slug: 'projects',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'client', 'category', 'completionTime', 'order'],
  },
  hooks: {
    beforeValidate: [
      async ({ data, req }) => {
        if (!data) return data
        const uploadedCover = await resolveMediaUrl(req, data.image)
        if (uploadedCover) data.imageUrl = uploadedCover
        if (data.testimonial) {
          const uploadedAvatar = await resolveMediaUrl(req, data.testimonial.avatar)
          if (uploadedAvatar) data.testimonial.avatarUrl = uploadedAvatar
        }
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
      admin: { description: 'Stable id consumed by the web app (e.g. "proj_hig_coffee").' },
    },
    { name: 'title', type: 'text', required: true },
    { name: 'client', type: 'text', required: true },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Cleaning', value: 'cleaning' },
        { label: 'Construction', value: 'construction' },
      ],
    },
    { name: 'location', type: 'text', required: true },
    { name: 'area', type: 'text', required: true },
    { name: 'completionTime', type: 'text', required: true },
    { name: 'description', type: 'textarea', required: true },
    { name: 'achievement', type: 'textarea', required: true },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Upload the project cover photo. Fills the image URL below automatically.',
      },
    },
    {
      name: 'imageUrl',
      type: 'text',
      required: true,
      admin: {
        description: 'Auto-filled from the uploaded image above, or paste an external image URL.',
      },
    },
    {
      name: 'tags',
      type: 'array',
      required: true,
      fields: [{ name: 'item', type: 'text', required: true }],
    },
    {
      name: 'testimonial',
      type: 'group',
      admin: { description: 'Optional client quote for this project. Leave author blank to omit.' },
      fields: [
        { name: 'author', type: 'text' },
        { name: 'role', type: 'text' },
        { name: 'content', type: 'textarea' },
        {
          name: 'avatar',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description: 'Upload the author photo. Fills the avatar URL below automatically.',
          },
        },
        {
          name: 'avatarUrl',
          type: 'text',
          admin: {
            description: 'Auto-filled from the uploaded avatar above, or paste an external URL.',
          },
        },
        { name: 'rating', type: 'number', min: 0, max: 5 },
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
