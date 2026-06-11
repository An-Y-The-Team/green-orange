import type { Access } from 'payload'

// Public (unauthenticated) reads see only published documents; logged-in users
// see everything (drafts included). The `_status exists false` branch keeps any
// pre-drafts rows visible after drafts are enabled on an existing collection.
export const readPublishedOrAuth: Access = ({ req: { user } }) => {
  if (user) return true
  return {
    or: [{ _status: { equals: 'published' } }, { _status: { exists: false } }],
  }
}
