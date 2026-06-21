import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'

// Write target for the web contact form. Public can CREATE (submit the form);
// authenticated staff (editors + admins) read/update leads; only admins delete.
// Mirrors the web `ContactSubmission` type (apps/web/src/types.ts). `submittedAt`
// is covered by Payload's built-in `createdAt`; `status` drives the sales pipeline.
export const ContactSubmissions: CollectionConfig = {
  slug: 'contact-submissions',
  labels: {
    singular: { en: 'Contact Submission', vi: 'Yêu cầu liên hệ' },
    plural: { en: 'Contact Submissions', vi: 'Yêu cầu liên hệ' },
  },
  access: {
    // Public website can submit the form; read/update fall back to Payload's
    // authenticated-user default. Deleting leads is restricted to admins.
    create: () => true,
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'email', 'phone', 'serviceCategory', 'status', 'createdAt'],
    group: { en: 'Leads', vi: 'Khách hàng tiềm năng' },
  },
  fields: [
    {
      name: 'fullName',
      type: 'text',
      required: true,
      label: { en: 'Full Name', vi: 'Họ và tên' },
    },
    // email/serviceId/message are optional: the web form only enforces
    // fullName + phone, so submissions can legitimately omit them.
    {
      name: 'email',
      type: 'email',
      label: { en: 'Email', vi: 'Email' },
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
      label: { en: 'Phone', vi: 'Số điện thoại' },
    },
    {
      name: 'serviceCategory',
      type: 'select',
      required: true,
      label: { en: 'Service Category', vi: 'Danh mục dịch vụ' },
      options: [
        { label: { en: 'Cleaning', vi: 'Vệ sinh' }, value: 'cleaning' },
        { label: { en: 'Construction', vi: 'Thi công' }, value: 'construction' },
        { label: { en: 'Both', vi: 'Cả hai' }, value: 'both' },
      ],
    },
    {
      name: 'serviceId',
      type: 'text',
      label: { en: 'Service ID', vi: 'Mã dịch vụ' },
      admin: {
        description: {
          en: 'Slug of the requested service (matches a Services.slug). Blank = no specific package.',
          vi: 'Mã định danh của dịch vụ yêu cầu (khớp với Services.slug). Để trống = không chọn gói cụ thể.',
        },
      },
    },
    {
      name: 'companyName',
      type: 'text',
      label: { en: 'Company Name', vi: 'Tên công ty' },
    },
    {
      name: 'address',
      type: 'text',
      label: { en: 'Address', vi: 'Địa chỉ' },
    },
    {
      name: 'message',
      type: 'textarea',
      label: { en: 'Message', vi: 'Tin nhắn' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      label: { en: 'Status', vi: 'Trạng thái' },
      access: {
        // Public submissions cannot set their own status; only admins change it.
        create: ({ req: { user } }) => Boolean(user),
        update: ({ req: { user } }) => Boolean(user),
      },
      options: [
        { label: { en: 'New', vi: 'Mới' }, value: 'new' },
        { label: { en: 'Processing', vi: 'Đang xử lý' }, value: 'processing' },
        { label: { en: 'Contacted', vi: 'Đã liên hệ' }, value: 'contacted' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
