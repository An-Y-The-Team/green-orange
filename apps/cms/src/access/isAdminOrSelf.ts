import type { Access } from 'payload'

// Admins can act on any user; everyone else is limited to their own document.
// Returning a query constraint (rather than false) lets editors still read/update
// their own profile without seeing others.
export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return { id: { equals: user.id } }
}
