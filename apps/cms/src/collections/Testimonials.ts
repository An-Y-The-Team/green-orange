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
  labels: {
    singular: { en: 'Testimonial', vi: 'Đánh giá' },
    plural: { en: 'Testimonials', vi: 'Đánh giá' },
  },
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
      label: { en: 'Slug', vi: 'Mã định danh' },
      admin: {
        description: {
          en: 'Stable id consumed by the web app (e.g. "testi_1").',
          vi: 'Mã định danh cố định cho ứng dụng web (ví dụ: "testi_1").',
        },
      },
    },
    {
      name: 'author',
      type: 'text',
      required: true,
      label: { en: 'Author', vi: 'Tác giả' },
    },
    {
      name: 'role',
      type: 'text',
      required: true,
      label: { en: 'Role', vi: 'Chức vụ' },
    },
    {
      name: 'company',
      type: 'text',
      required: true,
      label: { en: 'Company', vi: 'Công ty' },
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
      label: { en: 'Content', vi: 'Nội dung' },
    },
    {
      name: 'rating',
      type: 'number',
      required: true,
      min: 0,
      max: 5,
      label: { en: 'Rating', vi: 'Đánh giá' },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Avatar', vi: 'Ảnh đại diện' },
      admin: {
        description: {
          en: 'Upload the author photo. Fills the avatar URL below automatically.',
          vi: 'Tải lên ảnh tác giả. URL ảnh đại diện bên dưới sẽ được tự động điền.',
        },
      },
    },
    {
      name: 'avatarUrl',
      type: 'text',
      required: true,
      label: { en: 'Avatar URL', vi: 'URL ảnh đại diện' },
      admin: {
        description: {
          en: 'Auto-filled from the uploaded avatar above, or paste an external URL.',
          vi: 'Tự động điền từ ảnh tải lên ở trên, hoặc dán URL bên ngoài.',
        },
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      label: { en: 'Category', vi: 'Danh mục' },
      options: [
        { label: { en: 'Cleaning', vi: 'Vệ sinh' }, value: 'cleaning' },
        { label: { en: 'Construction', vi: 'Thi công' }, value: 'construction' },
        { label: { en: 'Both', vi: 'Cả hai' }, value: 'both' },
      ],
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
