import type { PayloadRequest } from 'payload'

// An upload-field value in an incoming hook payload is the related Media doc's
// id (number), or the populated doc, or null. Normalize to an id.
type UploadValue = number | { id?: number | null } | null | undefined

function toId(value: UploadValue): number | null {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && typeof value.id === 'number') return value.id
  return null
}

// Resolve an upload-field value to the Media doc's absolute URL string, or null
// if unset/not found. `serverURL` is configured on the Payload config, so the
// Media `url` is already absolute — the web app reads it at depth=0 as a string.
export async function resolveMediaUrl(
  req: PayloadRequest,
  value: UploadValue,
): Promise<string | null> {
  const id = toId(value)
  if (id == null) return null
  try {
    const media = await req.payload.findByID({ collection: 'media', id, depth: 0, req })
    return typeof media?.url === 'string' ? media.url : null
  } catch {
    return null
  }
}
