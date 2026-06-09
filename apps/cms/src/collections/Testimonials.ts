import type { CollectionConfig } from 'payload'

// Mirrors the web `Testimonial` type (apps/web/src/types.ts). Unlike Services
// and Projects, testimonials may target both service lines, so `category`
// includes the "both" option.
export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'author',
    defaultColumns: ['author', 'company', 'category', 'rating', 'order'],
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
    { name: 'avatarUrl', type: 'text', required: true },
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
