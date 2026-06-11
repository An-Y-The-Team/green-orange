import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminFieldAccess } from '../access/isAdmin'
import { isAdminOrSelf } from '../access/isAdminOrSelf'

export const Users: CollectionConfig = {
  slug: 'users',
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
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      access: {
        // Only admins may CHANGE a role — prevents an editor escalating their
        // own. Create is intentionally unrestricted at the field level: the
        // collection-level `create: isAdmin` already gates who can make users,
        // and the first-user hook below needs to set this on the initial admin
        // (a field-level create rule would strip the hook's value).
        update: isAdminFieldAccess,
      },
      admin: {
        description: 'Admins manage users, site settings, and deletions; editors manage content.',
      },
    },
  ],
  versions: false,
}
