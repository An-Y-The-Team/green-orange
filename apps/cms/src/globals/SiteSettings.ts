import type { GlobalConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'

// Editable site-wide content the business owner controls without a code deploy:
// company contact details, headline stats, hero copy, branding text, nav links,
// footer columns, and SEO defaults. The web app reads this via
// GET /api/globals/site-settings and falls back to hardcoded defaults
// (apps/web/src/data.ts) if the global is empty/unreachable.
//
// Intentionally NOT drafts-enabled: settings (phone, address, stats) should go
// live the moment they're saved, not wait behind a separate publish step. Only
// admins can edit them.

// Options for nav/footer section-anchor pickers. Must stay in sync with
// apps/web/src/constants/section.ts (SectionId enum).
const SECTION_OPTIONS = [
  { label: 'Hero', value: 'hero' },
  { label: 'Giới thiệu', value: 'introduction' },
  { label: 'Dịch vụ', value: 'services' },
  { label: 'Dự án', value: 'projects' },
  { label: 'Đánh giá', value: 'testimonials' },
  { label: 'Liên hệ', value: 'contact' },
] as const

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings',
  access: {
    read: () => true,
    update: isAdmin,
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
              admin: {
                description:
                  'Optional social / messaging links — rendered as icons in the footer when set.',
              },
              fields: [
                { name: 'facebook', type: 'text' },
                { name: 'zalo', type: 'text' },
                { name: 'messenger', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Branding & Nav',
          fields: [
            {
              name: 'branding',
              type: 'group',
              admin: {
                description: 'Wordmark text and short taglines shown in the header and footer.',
              },
              fields: [
                {
                  name: 'logoTextPrimary',
                  type: 'text',
                  admin: { description: 'First half of the wordmark, e.g. "Green".' },
                },
                {
                  name: 'logoTextSecondary',
                  type: 'text',
                  admin: { description: 'Second half of the wordmark, e.g. "Orange".' },
                },
                {
                  name: 'headerTagline',
                  type: 'text',
                  admin: { description: 'Small line under the logo in the header.' },
                },
                {
                  name: 'footerTagline',
                  type: 'text',
                  admin: { description: 'Small line under the logo in the footer.' },
                },
              ],
            },
            {
              name: 'navigation',
              type: 'group',
              admin: { description: 'Primary navigation links and header CTAs.' },
              fields: [
                {
                  name: 'items',
                  type: 'array',
                  admin: { description: 'Links shown in the desktop nav and mobile drawer.' },
                  fields: [
                    { name: 'label', type: 'text', required: true },
                    {
                      name: 'sectionId',
                      type: 'select',
                      required: true,
                      options: [...SECTION_OPTIONS],
                      admin: { description: 'Page section this link scrolls to.' },
                    },
                  ],
                },
                {
                  name: 'headerCtaLabel',
                  type: 'text',
                  admin: { description: 'Desktop header button label.' },
                },
                {
                  name: 'mobileCtaLabel',
                  type: 'text',
                  admin: { description: 'Mobile drawer button label (typically longer).' },
                },
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
          label: 'Footer',
          fields: [
            {
              name: 'footer',
              type: 'group',
              admin: { description: 'Footer copy, column headings, and quick links.' },
              fields: [
                {
                  name: 'brandDescription',
                  type: 'textarea',
                  admin: { description: 'Short paragraph under the footer logo.' },
                },
                {
                  name: 'quickLinksHeading',
                  type: 'text',
                  admin: { description: 'Heading above the quick-links column.' },
                },
                {
                  name: 'quickLinks',
                  type: 'array',
                  admin: { description: 'Anchor links listed in the quick-links column.' },
                  fields: [
                    { name: 'label', type: 'text', required: true },
                    {
                      name: 'sectionId',
                      type: 'select',
                      required: true,
                      options: [...SECTION_OPTIONS],
                    },
                  ],
                },
                {
                  name: 'officesHeading',
                  type: 'text',
                  admin: { description: 'Heading above the addresses column.' },
                },
                {
                  name: 'headquartersLabel',
                  type: 'text',
                  admin: {
                    description: 'Label above the head-office address (e.g. "Trụ Sở Hà Nội:").',
                  },
                },
                {
                  name: 'branchLabel',
                  type: 'text',
                  admin: { description: 'Label above the branch address.' },
                },
                {
                  name: 'supportHeading',
                  type: 'text',
                  admin: { description: 'Heading above the phone/email column.' },
                },
                {
                  name: 'hotlinePrefix',
                  type: 'text',
                  admin: { description: 'Text shown before the phone number (e.g. "Hotline:").' },
                },
                {
                  name: 'emailPrefix',
                  type: 'text',
                  admin: { description: 'Text shown before the email address (e.g. "Email:").' },
                },
                {
                  name: 'copyrightSuffix',
                  type: 'text',
                  admin: { description: 'Text after "© YEAR Company Name." in the footer base.' },
                },
                {
                  name: 'backToTopLabel',
                  type: 'text',
                  admin: { description: 'Label on the back-to-top link in the footer base.' },
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
