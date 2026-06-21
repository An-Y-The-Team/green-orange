import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { readPublishedOrAuth } from '../access/readPublishedOrAuth'

// Mirrors the web `Service` type (apps/web/src/types.ts). `slug` preserves the
// stable string id used by the web app; `order` keeps the display order that
// was implicit in the data.ts array. Drafts let editors stage content; the web
// (unauthenticated) only ever sees published docs.
export const Services: CollectionConfig = {
  slug: 'services',
  labels: {
    singular: { en: 'Service', vi: 'Dịch vụ' },
    plural: { en: 'Services', vi: 'Dịch vụ' },
  },
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
      label: { en: 'Slug', vi: 'Mã định danh' },
      admin: {
        description: {
          en: 'Stable id consumed by the web app (e.g. "cleaning_deep").',
          vi: 'Mã định danh cố định cho ứng dụng web (ví dụ: "cleaning_deep").',
        },
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: { en: 'Title', vi: 'Tên dịch vụ' },
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      label: { en: 'Description', vi: 'Mô tả' },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      label: { en: 'Category', vi: 'Danh mục' },
      options: [
        { label: { en: 'Cleaning', vi: 'Vệ sinh' }, value: 'cleaning' },
        { label: { en: 'Construction', vi: 'Thi công' }, value: 'construction' },
      ],
    },
    {
      name: 'duration',
      type: 'text',
      required: true,
      label: { en: 'Duration', vi: 'Thời gian thực hiện' },
    },
    {
      name: 'benefits',
      type: 'array',
      required: true,
      label: { en: 'Benefits', vi: 'Lợi ích' },
      fields: [
        {
          name: 'item',
          type: 'text',
          required: true,
          label: { en: 'Item', vi: 'Mục' },
        },
      ],
    },
    {
      name: 'features',
      type: 'array',
      required: true,
      label: { en: 'Features', vi: 'Tính năng' },
      fields: [
        {
          name: 'item',
          type: 'text',
          required: true,
          label: { en: 'Item', vi: 'Mục' },
        },
      ],
    },
    {
      name: 'iconName',
      type: 'text',
      required: true,
      label: { en: 'Icon Name', vi: 'Tên biểu tượng' },
      admin: {
        description: {
          en: 'lucide-react icon name, e.g. "Sparkles".',
          vi: 'Tên biểu tượng lucide-react, ví dụ: "Sparkles".',
        },
      },
    },
    {
      name: 'popular',
      type: 'checkbox',
      defaultValue: false,
      label: { en: 'Popular', vi: 'Phổ biến' },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: { en: 'Order', vi: 'Thứ tự' },
      admin: {
        position: 'sidebar',
        description: {
          en: 'Display order (ascending).',
          vi: 'Thứ tự hiển thị (tăng dần).',
        },
      },
    },
  ],
}
