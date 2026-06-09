import type { CollectionConfig } from 'payload'

// Write target for the web contact form. Public can CREATE (submit the form);
// only authenticated admins can read/update/delete. Mirrors the web
// `ContactSubmission` type (apps/web/src/types.ts). `submittedAt` is covered by
// Payload's built-in `createdAt`; `status` drives the sales pipeline.
export const ContactSubmissions: CollectionConfig = {
  slug: 'contact-submissions',
  access: {
    // Public website can submit the form; everything else stays admin-only
    // (read/update/delete fall back to Payload's authenticated-user default).
    create: () => true,
  },
  admin: {
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'email', 'phone', 'serviceCategory', 'status', 'createdAt'],
    group: 'Leads',
  },
  fields: [
    { name: 'fullName', type: 'text', required: true },
    // email/serviceId/message are optional: the web form only enforces
    // fullName + phone, so submissions can legitimately omit them.
    { name: 'email', type: 'email' },
    { name: 'phone', type: 'text', required: true },
    {
      name: 'serviceCategory',
      type: 'select',
      required: true,
      options: [
        { label: 'Cleaning', value: 'cleaning' },
        { label: 'Construction', value: 'construction' },
        { label: 'Both', value: 'both' },
      ],
    },
    {
      name: 'serviceId',
      type: 'text',
      admin: {
        description:
          'Slug of the requested service (matches a Services.slug). Blank = no specific package.',
      },
    },
    { name: 'companyName', type: 'text' },
    { name: 'address', type: 'text' },
    { name: 'message', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      access: {
        // Public submissions cannot set their own status; only admins change it.
        create: ({ req: { user } }) => Boolean(user),
        update: ({ req: { user } }) => Boolean(user),
      },
      options: [
        { label: 'New', value: 'new' },
        { label: 'Processing', value: 'processing' },
        { label: 'Contacted', value: 'contacted' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
