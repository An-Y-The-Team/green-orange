import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { readPublishedOrAuth } from '../access/readPublishedOrAuth'
import { resolveMediaUrl } from '../hooks/resolveMediaUrl'

// Mirrors the web `Project` type (apps/web/src/types.ts), including the optional
// embedded `testimonial` group. The web reads `imageUrl`/`avatarUrl` as plain
// string URLs at depth=0; the owner can either upload an image (preferred) or
// paste an external URL. The `beforeValidate` hook mirrors any uploaded media's
// absolute URL into the string field so the web contract is unchanged.
export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: {
    singular: { en: 'Project', vi: 'Dự án' },
    plural: { en: 'Projects', vi: 'Dự án' },
  },
  access: {
    read: readPublishedOrAuth,
    delete: isAdmin,
  },
  versions: { drafts: true },
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
      label: { en: 'Slug', vi: 'Mã định danh' },
      admin: {
        description: {
          en: 'Stable id consumed by the web app (e.g. "proj_hig_coffee").',
          vi: 'Mã định danh cố định cho ứng dụng web (ví dụ: "proj_hig_coffee").',
        },
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: { en: 'Title', vi: 'Tên dự án' },
    },
    {
      name: 'client',
      type: 'text',
      required: true,
      label: { en: 'Client', vi: 'Khách hàng' },
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
      name: 'location',
      type: 'text',
      required: true,
      label: { en: 'Location', vi: 'Địa điểm' },
    },
    {
      name: 'area',
      type: 'text',
      required: true,
      label: { en: 'Area', vi: 'Diện tích' },
    },
    {
      name: 'completionTime',
      type: 'text',
      required: true,
      label: { en: 'Completion Time', vi: 'Thời gian hoàn thành' },
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      label: { en: 'Description', vi: 'Mô tả' },
    },
    {
      name: 'achievement',
      type: 'textarea',
      required: true,
      label: { en: 'Achievement', vi: 'Thành tựu' },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Cover Image', vi: 'Ảnh bìa' },
      admin: {
        description: {
          en: 'Upload the project cover photo. Fills the image URL below automatically.',
          vi: 'Tải lên ảnh bìa dự án. URL ảnh bên dưới sẽ được tự động điền.',
        },
      },
    },
    {
      name: 'imageUrl',
      type: 'text',
      required: true,
      label: { en: 'Image URL', vi: 'URL ảnh' },
      admin: {
        description: {
          en: 'Auto-filled from the uploaded image above, or paste an external image URL.',
          vi: 'Tự động điền từ ảnh tải lên ở trên, hoặc dán URL ảnh bên ngoài.',
        },
      },
    },
    {
      name: 'tags',
      type: 'array',
      required: true,
      label: { en: 'Tags', vi: 'Thẻ' },
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
      name: 'testimonial',
      type: 'group',
      label: { en: 'Testimonial', vi: 'Đánh giá khách hàng' },
      admin: {
        description: {
          en: 'Optional client quote for this project. Leave author blank to omit.',
          vi: 'Trích dẫn khách hàng (tùy chọn). Để trống tác giả nếu không cần.',
        },
      },
      fields: [
        {
          name: 'author',
          type: 'text',
          label: { en: 'Author', vi: 'Tác giả' },
        },
        {
          name: 'role',
          type: 'text',
          label: { en: 'Role', vi: 'Chức vụ' },
        },
        {
          name: 'content',
          type: 'textarea',
          label: { en: 'Content', vi: 'Nội dung' },
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
          label: { en: 'Avatar URL', vi: 'URL ảnh đại diện' },
          admin: {
            description: {
              en: 'Auto-filled from the uploaded avatar above, or paste an external URL.',
              vi: 'Tự động điền từ ảnh tải lên ở trên, hoặc dán URL bên ngoài.',
            },
          },
        },
        {
          name: 'rating',
          type: 'number',
          min: 0,
          max: 5,
          label: { en: 'Rating', vi: 'Đánh giá' },
        },
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
