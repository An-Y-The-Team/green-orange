import type { Access, FieldAccess } from 'payload'

// Collection-level: only users with the `admin` role pass.
export const isAdmin: Access = ({ req: { user } }) => user?.role === 'admin'

// Field-level variant (e.g. who may set the `role` field on Users).
export const isAdminFieldAccess: FieldAccess = ({ req: { user } }) => user?.role === 'admin'
