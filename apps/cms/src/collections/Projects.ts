import type { CollectionConfig } from 'payload'

// Mirrors the web `Project` type (apps/web/src/types.ts), including the optional
// embedded `testimonial` group. `imageUrl`/`avatarUrl` are stored as plain URL
// text to match the web contract (no Media uploads in this pass).
export const Projects: CollectionConfig = {
  slug: 'projects',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'client', 'category', 'completionTime', 'order'],
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
    { name: 'imageUrl', type: 'text', required: true },
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
        { name: 'avatarUrl', type: 'text' },
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
