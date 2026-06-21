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
              admin: { description: 'Landing hero section copy, headline, CTAs, and benefits.' },
              fields: [
                {
                  name: 'backgroundImage',
                  type: 'upload',
                  relationTo: 'media',
                  admin: {
                    description:
                      'Full-bleed background photo behind the hero card. Leave empty to fall back to the default Unsplash photo.',
                  },
                },
                {
                  name: 'trustBadge',
                  type: 'text',
                  admin: {
                    description:
                      'Pill label above the headline (e.g. "Tiêu chuẩn quốc tế ISO 9001:2015 ...").',
                  },
                },
                {
                  name: 'headlineSegments',
                  type: 'array',
                  admin: {
                    description:
                      'The decorated multi-line headline, broken into colored pieces. The renderer will join segments with a space and respect "new line before".',
                  },
                  fields: [
                    { name: 'text', type: 'text', required: true },
                    {
                      name: 'color',
                      type: 'select',
                      required: true,
                      defaultValue: 'white',
                      options: [
                        { label: 'White (plain)', value: 'white' },
                        { label: 'Emerald (brand)', value: 'emerald' },
                        { label: 'Orange (brand)', value: 'orange' },
                      ],
                    },
                    {
                      name: 'italic',
                      type: 'checkbox',
                      admin: { description: 'Render this segment in italic.' },
                    },
                    {
                      name: 'newLineBefore',
                      type: 'checkbox',
                      admin: { description: 'Start a new line before this segment.' },
                    },
                  ],
                },
                {
                  name: 'subheadline',
                  type: 'textarea',
                  admin: { description: 'The paragraph under the main hero heading.' },
                },
                {
                  name: 'benefits',
                  type: 'array',
                  admin: {
                    description: 'Selling points shown in the 2x2 grid inside the hero card.',
                  },
                  fields: [{ name: 'item', type: 'text', required: true }],
                },
                {
                  name: 'primaryCta',
                  type: 'group',
                  admin: { description: 'Filled orange button.' },
                  fields: [
                    { name: 'label', type: 'text' },
                    {
                      name: 'href',
                      type: 'text',
                      admin: { description: 'Anchor like "#contact" or an external URL.' },
                    },
                  ],
                },
                {
                  name: 'secondaryCta',
                  type: 'group',
                  admin: { description: 'Outline button next to the primary CTA.' },
                  fields: [
                    { name: 'label', type: 'text' },
                    { name: 'href', type: 'text' },
                  ],
                },
                {
                  name: 'trustStrap',
                  type: 'textarea',
                  admin: {
                    description: 'Mini line below the CTAs (e.g. "Cam kết đồng hành tin cậy...").',
                  },
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
          label: 'Introduction',
          fields: [
            {
              name: 'introduction',
              type: 'group',
              admin: {
                description:
                  'Company introduction section: brand story, brand-color meanings, and the 5-step process.',
              },
              fields: [
                {
                  name: 'eyebrow',
                  type: 'text',
                  admin: { description: 'Small label above the heading.' },
                },
                { name: 'heading', type: 'text' },
                {
                  name: 'narrative',
                  type: 'textarea',
                  admin: {
                    description:
                      'Long company-narrative paragraph. Use **text** for bold; the placeholder {founded} expands to the founding year from Company tab.',
                  },
                },
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { description: 'Square photo shown next to the brand-color story.' },
                },
                {
                  name: 'mottoEyebrow',
                  type: 'text',
                  admin: {
                    description:
                      'Label above the motto overlay on the photo (e.g. "Phương châm làm nghề").',
                  },
                },
                {
                  name: 'brandStoryHeading',
                  type: 'text',
                  admin: { description: 'Heading next to the photo.' },
                },
                {
                  name: 'brandStoryIntro',
                  type: 'textarea',
                  admin: { description: 'Paragraph under the brand-story heading.' },
                },
                {
                  name: 'brandValues',
                  type: 'array',
                  admin: {
                    description:
                      'The three brand colors and the meaning each represents. Recommend exactly 3 entries.',
                  },
                  fields: [
                    { name: 'title', type: 'text', required: true },
                    { name: 'description', type: 'textarea', required: true },
                    {
                      name: 'icon',
                      type: 'select',
                      required: true,
                      options: [
                        { label: 'Wrench', value: 'Wrench' },
                        { label: 'ShieldCheck', value: 'ShieldCheck' },
                        { label: 'Trees', value: 'Trees' },
                      ],
                    },
                    {
                      name: 'accent',
                      type: 'select',
                      required: true,
                      options: [
                        { label: 'Orange', value: 'orange' },
                        { label: 'Slate', value: 'slate' },
                        { label: 'Emerald', value: 'emerald' },
                      ],
                    },
                  ],
                },
                {
                  name: 'processEyebrow',
                  type: 'text',
                  admin: {
                    description: 'Label above the process heading (e.g. "Khép kín & Hoàn hảo").',
                  },
                },
                { name: 'processHeading', type: 'text' },
                { name: 'processIntro', type: 'textarea' },
                {
                  name: 'processSteps',
                  type: 'array',
                  admin: {
                    description: 'Service-delivery process steps. Recommend exactly 5 entries.',
                  },
                  fields: [
                    {
                      name: 'num',
                      type: 'text',
                      required: true,
                      admin: { description: 'Two-digit string e.g. "01".' },
                    },
                    { name: 'title', type: 'text', required: true },
                    { name: 'description', type: 'textarea', required: true },
                  ],
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
