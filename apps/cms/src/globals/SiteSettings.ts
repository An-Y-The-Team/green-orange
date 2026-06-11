import type { GlobalConfig } from 'payload'

// Editable site-wide content the business owner controls without a code deploy:
// company contact details, headline stats, hero copy, and SEO defaults. The web
// app reads this via GET /api/globals/site-settings and falls back to hardcoded
// defaults (apps/web/src/data.ts) if the global is empty/unreachable.
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings',
  access: {
    read: () => true,
  },
  admin: {
    group: 'Settings',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Company',
          fields: [
            {
              name: 'company',
              type: 'group',
              fields: [
                { name: 'name', type: 'text', admin: { description: 'Full legal company name.' } },
                { name: 'shortName', type: 'text' },
                {
                  name: 'founded',
                  type: 'text',
                  admin: { description: 'Year founded, e.g. "2019".' },
                },
                {
                  name: 'phone',
                  type: 'text',
                  admin: {
                    description: 'Primary contact number — the main call-to-action channel.',
                  },
                },
                { name: 'email', type: 'text' },
                {
                  name: 'address',
                  type: 'textarea',
                  admin: { description: 'Head office address.' },
                },
                {
                  name: 'branch',
                  type: 'textarea',
                  admin: { description: 'Secondary branch address.' },
                },
                { name: 'motto', type: 'textarea' },
                { name: 'certification', type: 'textarea' },
              ],
            },
            {
              name: 'social',
              type: 'group',
              admin: { description: 'Optional social / messaging links.' },
              fields: [
                { name: 'facebook', type: 'text' },
                { name: 'zalo', type: 'text' },
                { name: 'messenger', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Hero',
          fields: [
            {
              name: 'hero',
              type: 'group',
              admin: { description: 'Intro copy shown in the landing hero section.' },
              fields: [
                {
                  name: 'subheadline',
                  type: 'textarea',
                  admin: { description: 'The paragraph under the main hero heading.' },
                },
              ],
            },
            {
              name: 'stats',
              type: 'array',
              admin: { description: 'Headline counters (e.g. "500+" projects delivered).' },
              fields: [
                {
                  name: 'value',
                  type: 'text',
                  required: true,
                  admin: { description: 'e.g. "500+"' },
                },
                { name: 'label', type: 'text', required: true },
                {
                  name: 'color',
                  type: 'text',
                  admin: { description: 'Tailwind text-color class, e.g. "text-green-600".' },
                },
              ],
            },
          ],
        },
        {
          label: 'SEO',
          fields: [
            {
              name: 'seo',
              type: 'group',
              admin: {
                description: 'Default metadata used when a page has no specific SEO entry.',
              },
              fields: [
                { name: 'metaTitle', type: 'text' },
                { name: 'metaDescription', type: 'textarea' },
                {
                  name: 'ogImage',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { description: 'Social share image (Open Graph / Twitter card).' },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
