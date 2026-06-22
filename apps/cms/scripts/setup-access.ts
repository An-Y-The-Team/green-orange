/**
 * Phase 3 — Access control for the Green-Orange Directus CMS.
 *
 * Replaces the old Payload `src/access/*.ts` rules with Directus policies,
 * permissions, roles, and a read-only static token for the web app. Idempotent:
 * skips permissions/roles/users that already exist.
 *
 * Maps:
 *   readPublishedOrAuth  → Public policy reads only status=published content;
 *                          Editor reads everything.
 *   isAuthenticated      → Editor role: CRUD on content + files.
 *   isAdmin              → Administrator (built in).
 *   ContactSubmissions   → Public create (no status field); staff read/update.
 *
 * Run (Bun, per AGENTS.md):
 *   DIRECTUS_PUBLIC_URL=http://localhost:8055 \
 *   DIRECTUS_ADMIN_EMAIL=admin@example.com \
 *   DIRECTUS_ADMIN_PASSWORD=admin \
 *   bun apps/cms/scripts/setup-access.ts
 *
 * On success it prints DIRECTUS_STATIC_TOKEN — copy it into apps/web/.env.
 */

const BASE = process.env.DIRECTUS_PUBLIC_URL ?? 'http://localhost:8055'
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL ?? 'admin@example.com'
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD ?? 'admin'

const FRONTEND_USER_EMAIL = 'frontend@example.com'

let token = ''

const api = async (method: string, path: string, body?: unknown): Promise<unknown> => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${text}`)
  }
  return text ? JSON.parse(text) : null
}

// Collections the public (and the frontend service account) may read.
const READ_PUBLISHED = ['services', 'projects', 'testimonials'] as const
const READ_ALL = [
  'site_settings',
  'site_nav_items',
  'site_footer_links',
  'site_hero_segments',
  'site_stats',
  'site_brand_values',
  'site_process_steps',
  'directus_files',
] as const
interface IdRow {
  id: string
}

const findPublicPolicyId = async (): Promise<string> => {
  const res = (await api('GET', '/policies?fields=id,name&limit=-1')) as {
    data: { id: string; name: string }[]
  }
  const pub = res.data.find((p) => p.name === '$t:public_label')
  if (!pub) throw new Error('Public policy not found')
  return pub.id
}

// (collection:action) pairs already present on a policy, so re-runs are no-ops.
const existingPerms = async (policyId: string): Promise<Set<string>> => {
  const res = (await api(
    'GET',
    `/permissions?filter[policy][_eq]=${policyId}&fields=collection,action&limit=-1`,
  )) as { data: { collection: string; action: string }[] }
  return new Set(res.data.map((p) => `${p.collection}:${p.action}`))
}

// NOTE (Directus 12 free tier): custom permission RULES — item-level filters
// (e.g. status=published) and field-subset restrictions — are a licensed
// feature ("custom_permission_rules_enabled"). The free tier only allows
// FULL-ACCESS permissions (all fields, no filter). So permissions here are
// always full-access; the "published-only" visibility for the public site is
// enforced at QUERY time in apps/web/src/data.ts (Phase 4), not here.
const addPermission = async ({
  policyId,
  collection,
  action,
  have,
}: {
  policyId: string
  collection: string
  action: 'create' | 'read' | 'update' | 'delete'
  have: Set<string>
}): Promise<void> => {
  const key = `${collection}:${action}`
  if (have.has(key)) {
    console.log(`  • ${key} (exists)`)
    return
  }
  // Body intentionally minimal: only full-access fields ['*'], no `permissions`
  // filter / `validation` / field subset — anything else trips the license gate.
  await api('POST', '/permissions', { policy: policyId, collection, action, fields: ['*'] })
  have.add(key)
  console.log(`  ✓ ${key}`)
}

// Grant full-access read to a policy for the public read set (Public + Frontend).
const grantReadPublished = async (policyId: string): Promise<void> => {
  const have = await existingPerms(policyId)
  for (const collection of [...READ_PUBLISHED, ...READ_ALL]) {
    await addPermission({ policyId, collection, action: 'read', have })
  }
}

const ensureRole = async (name: string): Promise<string> => {
  const res = (await api(
    'GET',
    `/roles?filter[name][_eq]=${encodeURIComponent(name)}&fields=id&limit=1`,
  )) as {
    data: IdRow[]
  }
  if (res.data[0]) return res.data[0].id
  const created = (await api('POST', '/roles', { name })) as { data: IdRow }
  return created.data.id
}

const createPolicy = async (name: string, appAccess: boolean): Promise<string> => {
  const res = (await api(
    'GET',
    `/policies?filter[name][_eq]=${encodeURIComponent(name)}&fields=id&limit=1`,
  )) as {
    data: IdRow[]
  }
  if (res.data[0]) return res.data[0].id
  const created = (await api('POST', '/policies', {
    name,
    icon: 'badge',
    admin_access: false,
    app_access: appAccess,
  })) as { data: IdRow }
  return created.data.id
}

const linkRolePolicy = async (roleId: string, policyId: string): Promise<void> => {
  const res = (await api(
    'GET',
    `/access?filter[role][_eq]=${roleId}&filter[policy][_eq]=${policyId}&fields=id&limit=1`,
  )) as { data: IdRow[] }
  if (res.data[0]) return
  await api('POST', '/access', { role: roleId, policy: policyId })
}

const main = async (): Promise<void> => {
  console.log(`Logging in to ${BASE}…`)
  const login = (await api('POST', '/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })) as {
    data: { access_token: string }
  }
  token = login.data.access_token

  // ── 1. Public policy: read published + read singleton/children/files + create leads ──
  console.log('\nPublic policy')
  const publicPolicyId = await findPublicPolicyId()
  await grantReadPublished(publicPolicyId)
  const publicHave = await existingPerms(publicPolicyId)
  // Full-access create (field subset is license-gated). `status` defaults to
  // 'new' via the schema; the frontend never sends it.
  await addPermission({
    policyId: publicPolicyId,
    collection: 'contact_submissions',
    action: 'create',
    have: publicHave,
  })

  // ── 2. Frontend service account (read published) + static token ─────────────
  console.log('\nFrontend service account')
  const frontendRoleId = await ensureRole('Frontend (read published)')
  const frontendPolicyId = await createPolicy('Frontend Read Published', false)
  await linkRolePolicy(frontendRoleId, frontendPolicyId)
  await grantReadPublished(frontendPolicyId)

  // Reuse the existing token on re-run (don't rotate — it's wired into apps/web env).
  let staticToken = `fe_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`
  const existingUser = (await api(
    'GET',
    `/users?filter[email][_eq]=${encodeURIComponent(FRONTEND_USER_EMAIL)}&fields=id,token&limit=1`,
  )) as { data: { id: string; token: string | null }[] }
  if (existingUser.data[0]) {
    const current = existingUser.data[0].token
    if (current) {
      staticToken = current
      await api('PATCH', `/users/${existingUser.data[0].id}`, { role: frontendRoleId })
      console.log('  • frontend user exists — reusing existing token')
    } else {
      await api('PATCH', `/users/${existingUser.data[0].id}`, {
        token: staticToken,
        role: frontendRoleId,
      })
      console.log('  • frontend user exists — token set')
    }
  } else {
    await api('POST', '/users', {
      email: FRONTEND_USER_EMAIL,
      first_name: 'Frontend',
      last_name: 'Service',
      role: frontendRoleId,
      token: staticToken,
      status: 'active',
    })
    console.log('  ✓ frontend user created')
  }

  // ── 3. Editor role: manage content (isAuthenticated). Delete stays admin-only. ──
  console.log('\nEditor role')
  const editorRoleId = await ensureRole('Editor')
  const editorPolicyId = await createPolicy('Editor Content Management', true)
  await linkRolePolicy(editorRoleId, editorPolicyId)
  const editorHave = await existingPerms(editorPolicyId)
  const CONTENT = ['services', 'projects', 'testimonials']
  const CHILDREN = [
    'site_nav_items',
    'site_footer_links',
    'site_hero_segments',
    'site_stats',
    'site_brand_values',
    'site_process_steps',
  ]
  for (const collection of CONTENT) {
    for (const action of ['create', 'read', 'update'] as const) {
      await addPermission({ policyId: editorPolicyId, collection, action, have: editorHave })
    }
  }
  for (const action of ['read', 'update'] as const) {
    await addPermission({
      policyId: editorPolicyId,
      collection: 'site_settings',
      action,
      have: editorHave,
    })
  }
  for (const collection of CHILDREN) {
    for (const action of ['create', 'read', 'update', 'delete'] as const) {
      await addPermission({ policyId: editorPolicyId, collection, action, have: editorHave })
    }
  }
  for (const action of ['read', 'update'] as const) {
    await addPermission({
      policyId: editorPolicyId,
      collection: 'contact_submissions',
      action,
      have: editorHave,
    })
  }
  for (const action of ['create', 'read', 'update'] as const) {
    await addPermission({
      policyId: editorPolicyId,
      collection: 'directus_files',
      action,
      have: editorHave,
    })
  }

  console.log('\n────────────────────────────────────────────────────────')
  console.log('DIRECTUS_STATIC_TOKEN=' + staticToken)
  console.log('────────────────────────────────────────────────────────')
  console.log('Copy the token above into apps/web/.env (server-only).')
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('\nAccess setup failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
