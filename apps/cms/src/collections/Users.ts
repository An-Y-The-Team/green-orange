import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminFieldAccess } from '../access/isAdmin'
import { isAdminOrSelf } from '../access/isAdminOrSelf'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: { en: 'User', vi: 'Người dùng' },
    plural: { en: 'Users', vi: 'Người dùng' },
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role'],
  },
  auth: true,
  access: {
    // Admins manage everyone; editors can only see/edit their own profile.
    read: isAdminOrSelf,
    create: isAdmin,
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      async ({ req, operation, data }) => {
        // The very first user (created via registerFirstUser) is forced to admin
        // so the instance is never left without one.
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', req })
          if (totalDocs === 0) data.role = 'admin'
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      label: { en: 'Role', vi: 'Vai trò' },
      options: [
        { label: { en: 'Admin', vi: 'Quản trị viên' }, value: 'admin' },
        { label: { en: 'Editor', vi: 'Biên tập viên' }, value: 'editor' },
      ],
      access: {
        // Only admins may CHANGE a role — prevents an editor escalating their
        // own. Create is intentionally unrestricted at the field level: the
        // collection-level `create: isAdmin` already gates who can make users,
        // and the first-user hook below needs to set this on the initial admin
        // (a field-level create rule would strip the hook's value).
        create: () => true,
        update: isAdminFieldAccess,
      },
      admin: {
        description: {
          en: 'Admins manage users, site settings, and deletions; editors manage content.',
          vi: 'Quản trị viên quản lý người dùng, cài đặt trang và xóa dữ liệu; biên tập viên quản lý nội dung.',
        },
      },
    },
  ],
  versions: false,
}
