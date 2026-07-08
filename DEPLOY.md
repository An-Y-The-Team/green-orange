# Deployment — Self-hosted VPS (Docker Compose + GitHub Actions + Dockhand)

Build the app images on **GitHub Actions**, push to **GHCR** (private), then
trigger **Dockhand** (the Docker management UI on the VPS) to pull and deploy the
stack via Docker Compose: Postgres + CMS + web behind **Caddy** with automatic
Let's Encrypt TLS. The CMS is **Directus**, pulled from its **official image** (we
don't build a CMS image). **Dockhand is the deployer** — GitHub Actions builds and
signals; it no longer SSHes in or runs `compose` itself.

```bash
push tag vX.Y.Z ─► GitHub Actions ─► build web+crm (amd64) ─► GHCR
                                          │
              bump deploy/deploy.env image tags ─► push `release` branch
                                          │
              join Pangolin tunnel ─► POST Dockhand webhook ──┐
                                                              ▼
VPS: Dockhand git-pulls `release`, reads deploy/deploy.env (+ its own secret
     store), runs `docker compose up -d` (cms bootstraps + schema-applies on start)

     caddy(443) ─► web:3000           ┌ Postgres (internal, volume: pgdata)
                 └► cms:8055 ──────────┘ uploads (volume: media → /directus/uploads)
     (auto-HTTPS; certs persist in volume: caddy_data)
```

The VPS never builds — it only pulls finished images (the app images from GHCR
and the official `directus/directus`), so a small (1–2 GB) box is fine.

## Env split: `deploy/deploy.env` (tracked) vs Dockhand secret store

The prod stack's config is split by sensitivity:

- **Non-secret config** (image tags, domains, public URLs, `AUTHENTIK_TAG`, admin
  email) lives in the **tracked `deploy/deploy.env`**. Edit it on GitHub or in
  Dockhand. CI rewrites the three `*_IMAGE` lines on each release.
- **Secrets** (`POSTGRES_PASSWORD`, `DIRECTUS_KEY`/`SECRET`/`ADMIN_PASSWORD`/
  `STATIC_TOKEN`/`PREVIEW_SECRET`, `CRM_AUTH_SECRET`, `CRM_OIDC_CLIENT_SECRET`,
  `AUTHENTIK_SECRET_KEY`/`BOOTSTRAP_PASSWORD`/`BOOTSTRAP_TOKEN`) live **only in
  Dockhand's secret store** — injected via shell env at deploy time, never written
  to disk or git. Set these once in the Dockhand stack's env editor.

Dockhand's git stack reads `deploy/deploy.env` as the compose env-file (lowest
precedence), then layers its stored vars/secrets on top. Keep each var in a single
home to avoid a stored value silently shadowing the file.

> **Legacy note:** the old flow kept everything in a gitignored `.env.production`
> on the VPS that the SSH deploy `sed`-edited. That file is no longer used by the
> pipeline; migrate its values into `deploy/deploy.env` (non-secret) and Dockhand
> (secret).

---

## 1. Prerequisites

- A VPS (Ubuntu 22.04+, **amd64**) with a public IP.
- A domain. Two DNS **A** records pointing at the VPS IP:
  - `example.com` (and `www.example.com`) → site
  - `cms.example.com` → Directus Studio/API
- Docker Engine + Compose plugin on the VPS.
- This repo pushed to GitHub.

> **Network model:** the public site + CMS stay public on **80/443** (served by
> Caddy). **SSH (22) is NOT public** — it's reachable only over the **Pangolin**
> network. CI therefore joins that network (Olm client) before deploying. See
> §2a.
>
> Repo: `An-Y-The-Team/green-orange` → app images publish to
> `ghcr.io/an-y-the-team/green-orange-{web,crm-web,crm-api}`. The CMS is **not**
> built here — it's the official `directus/directus` image pulled at deploy.
> Replace `example.com` throughout with your real domain.

---

## 2. GitHub configuration (one-time)

### Repo → Settings → Secrets and variables → Actions

Secrets:

| Name                   | Value                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `DOCKHAND_WEBHOOK_URL` | Full secret-bearing webhook URL of the Dockhand `green-orange` git stack, using its **tunnel-internal** host:port (reached over Pangolin). |
| `PANGOLIN_ID`          | Pangolin client ID (used by `pangolin up --id`)                                                                                            |
| `PANGOLIN_SECRET`      | Pangolin client secret (`pangolin up --secret`)                                                                                            |
| `PANGOLIN_ENDPOINT`    | Pangolin control URL, e.g. `https://prp.hdc-cloud.org`                                                                                     |

> **No SSH secrets.** The deploy job no longer SSHes in, so `VPS_HOST`,
> `VPS_USER`, `VPS_SSH_KEY`, `VPS_PORT`, `VPS_PATH`, and `VPS_PANGOLIN_IP` are no
> longer used by the pipeline (it joins Pangolin only to reach the webhook, not to
> SSH). You can delete them once the Dockhand flow is confirmed working. §2a and
> §3's "CI deploy SSH key" steps below are likewise legacy.

Variables:

| Name                  | Value                                                         |
| --------------------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_CMS_URL` | `https://cms.example.com` (baked into the web image at build) |

GHCR push uses the built-in `GITHUB_TOKEN` — no extra token needed for the build side.

---

## 2a. Pangolin access for CI (private Dockhand webhook)

Nothing management-related on the VPS is public — Dockhand's webhook, like SSH,
is only reachable over the **Pangolin** network. So the deploy job joins the
tunnel with the `pangolin` client before it can `curl` the webhook — the same
command you run locally:

```bash
pangolin up --id <CLIENT_ID> --secret <CLIENT_SECRET> --endpoint https://prp.hdc-cloud.org
```

In Pangolin: the VPS is a **Site** (Newt agent). Expose **Dockhand's HTTP port**
as a client-resource (the same way SSH used to be), so it's reachable at a stable
tunnel address. Register a **Client** for CI to get the id/secret, then set the
GitHub secrets:

- `PANGOLIN_ID`, `PANGOLIN_SECRET`, `PANGOLIN_ENDPOINT` (`https://prp.hdc-cloud.org`)
- `DOCKHAND_WEBHOOK_URL` — the stack's webhook URL built on that tunnel-internal
  address (see §5), e.g. `http://<dockhand-tunnel-ip>:<port>/api/git/stacks/<id>/webhook`

> **Make it a Private Resource in Host mode** (TCP, Dockhand's port — e.g. `4444`),
> not HTTP mode. HTTP mode needs tunnel DNS, which is unreliable in headless CI (it
> times out). Host mode is reached at the resource's own **tunnel IP**, and each
> resource gets its **own** IP — the SSH resource's IP is _not_ Dockhand's. Use the
> IP, not the alias, in the URL. Find it from a tunnel-connected machine:
> `route get <alias>` (macOS) / `getent hosts <alias>` (Linux).
>
> ⚠️ The `/api/git/stacks/<id>/` **id changes if you delete and re-add the stack** —
> a stale id returns `404`. Re-copy the webhook URL from Dockhand after any re-add.

The workflow's **"Connect to Pangolin and trigger Dockhand"** step:

1. Installs the CLI (`get-cli.sh`).
2. `sudo pangolin up … --override-dns --attach &` — foreground mode, backgrounded
   with output redirected to a log. `--attach` keeps logging to the file (the
   default daemonize mode fails without a TTY).
3. Waits for `WireGuard device created`, then for the relay path.
4. `curl -X POST "$DOCKHAND_WEBHOOK_URL"` through the tunnel (with retries).

The tunnel only needs to stay up long enough for the one webhook call.

> ⚠️ Rotate the Pangolin client secret if it has ever been shared in plaintext.
> The webhook URL is itself a secret (it embeds a token) — treat it like a
> credential and regenerate it in Dockhand if leaked.

---

## 3. VPS first-time setup

```bash
# As root: install Docker + compose plugin
curl -fsSL https://get.docker.com | sh

# Create a deploy user and add to docker group
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy

# Firewall: expose only the public site. SSH stays OFF the public internet —
# it's reached over the Pangolin tunnel. (Keep a console/out-of-band way in.)
ufw allow 80 && ufw allow 443 && ufw enable
# Do NOT `ufw allow OpenSSH`. If you need a safety net during setup, allow SSH
# from your Pangolin/admin subnet only, e.g.:
#   ufw allow from <PANGOLIN_SUBNET> to any port 22
```

### Dockhand + GHCR access

The deployer on the VPS is **Dockhand** (a Docker management UI). It clones the
repo, reads `deploy/deploy.env` + its own secret store, and runs `compose` against
the host Docker daemon — so there is **no CI SSH key and no hand-cloned repo** to
set up. Ensure on the VPS:

1. **Dockhand is running** and reachable over the Pangolin tunnel (expose its port
   as a client-resource — see §2a). Keep it **off** the public internet.
2. **GHCR pull credentials** so Dockhand can pull the private app images. Use a
   **classic PAT with `read:packages`** — a _fine-grained_ token can't grant org
   `Packages: read` unless it's resource-owned by the org (repo Contents access is
   not enough, and that's the one that authenticates the git clone, not the pull).
   Add it via **Dockhand's registry credentials** (`ghcr.io` / your GitHub login /
   the PAT). Note a plain host `docker login` does **not** reach Dockhand — Dockhand
   pulls with its **own** client creds over the socket, so if you must use the CLI,
   log in **inside the container** (leaves the host's own creds untouched):

   ```bash
   docker exec dockhand sh -c 'echo "<CLASSIC_PAT>" | docker login ghcr.io -u <github-login> --password-stdin'
   ```

   (GitHub org SSO? Authorize the classic PAT for the org first.)

The stack's env is **not** a `.env.production` file anymore — non-secret config
lives in the tracked `deploy/deploy.env`, secrets in Dockhand's secret store (see
"Env split" above and the §5 setup). There are **no proxy config files to edit** —
Caddy reads `SITE_DOMAIN`, `CMS_DOMAIN`, and `ACME_EMAIL` from the environment via
the `Caddyfile`.

---

## 4. TLS — automatic

There is no cert step. Once DNS resolves to the VPS and the stack is up
(section 5), Caddy obtains and renews Let's Encrypt certificates automatically on
first request to each domain, storing them in the persistent `caddy_data` volume.

Just make sure DNS is correct **before** first start (Caddy validates over ports
80/443) and that the firewall allows 80 + 443. If you want a rate-limit-safe dry
run, point `ACME_EMAIL` at a real address and watch `docker compose logs caddy`.

---

## 5. First deploy

One-time Dockhand setup, then cut a release.

**A. Register the stack in Dockhand (once):**

1. In Dockhand, create a **git stack** pointing at this repo:
   - branch **`release`**, compose path **`docker-compose.prod.yml`**,
     env-file path **`deploy/deploy.env`**, stack name **`green-orange`** (must
     match the pinned `name:` in the compose file so Dockhand adopts the same
     project rather than starting a parallel one).
2. In the stack's env editor, add every **secret** from the list in
   "Env split" above (mark them secret). Non-secrets already come from
   `deploy/deploy.env`.
3. Add the **GHCR registry credential** (classic `read:packages` PAT — see §3) so
   Dockhand can pull the private images.
4. Enable the stack **webhook**, copy its full URL, and save it as the GitHub
   Actions secret **`DOCKHAND_WEBHOOK_URL`** (swap the host for Dockhand's
   tunnel-internal IP:port — see §2a). Re-copy it after any delete/re-add of the
   stack: the `/api/git/stacks/<id>/` id changes and a stale id `404`s.

**B. Cut a release** — this triggers the full pipeline:

```bash
git tag v1.0.0 && git push origin v1.0.0
```

GitHub builds the images, pushes to GHCR, bumps the image tags in
`deploy/deploy.env`, force-updates the `release` branch, then joins the Pangolin
tunnel and POSTs the Dockhand webhook. Dockhand pulls `release` and runs
`docker compose up -d`.

> **Manual first deploy** (e.g. to have images present before TLS): once at least
> one build job has pushed images to GHCR, trigger a deploy straight from
> Dockhand (the stack's **Deploy**/**Pull & redeploy** action) — no SSH or hand-run
> `compose` needed.

> **One-time: create the `directus` database.** The Postgres init script only
> creates databases on a **fresh** volume. On an existing prod volume, create it
> by hand once **before** the CMS starts (the legacy Payload `cms` DB is left
> intact for rollback):
>
> ```bash
> # Address the postgres container directly (no env-file needed; local socket =
> # trust auth). Match it by compose service label so the command works whatever
> # the project name is (green-orange vs a folder-derived yan-portf).
> PG=$(docker ps -qf label=com.docker.compose.service=postgres)
> docker exec "$PG" psql -U postgres -c "CREATE DATABASE directus;"
> ```

On start the CMS container runs `directus bootstrap` (creates the tables + the
admin user from `DIRECTUS_ADMIN_EMAIL` / `DIRECTUS_ADMIN_PASSWORD`) and
`directus schema apply` (creates all collections from the committed
`apps/cms/snapshots/snapshot.yaml`) — both idempotent.

---

## 6. Post-deploy

```bash
# 1. Log in to the Studio (admin was created by `directus bootstrap`).
open https://cms.example.com        # login: DIRECTUS_ADMIN_EMAIL / DIRECTUS_ADMIN_PASSWORD

# 2. Set up access control + mint the web app's read token.
#    Run from apps/cms on the authorized machine (it just needs to reach the prod CMS):
cd apps/cms
DIRECTUS_PUBLIC_URL=https://cms.example.com \
DIRECTUS_ADMIN_EMAIL=<admin> DIRECTUS_ADMIN_PASSWORD=<pw> \
bun run setup-access                 # prints DIRECTUS_STATIC_TOKEN=...

# 3. Put the printed token into Dockhand as the DIRECTUS_STATIC_TOKEN secret,
#    then redeploy the stack from Dockhand so the web service picks it up.
#    (DIRECTUS_STATIC_TOKEN is a secret — it does NOT go in deploy/deploy.env.)

# 4a. Carry the REAL Payload content over (cutover) — while old Payload still runs:
#     see docs/payload-to-directus-migration/prod-data-migration.md, then
#     PAYLOAD_EXPORT_DIR=... bun run migrate-from-payload
# 4b. …or just load DEMO content instead:
DIRECTUS_PUBLIC_URL=https://cms.example.com \
DIRECTUS_ADMIN_EMAIL=<admin> DIRECTUS_ADMIN_PASSWORD=<pw> \
bun run seed
```

> The web app's published reads fall back to **anonymous** access (the Public
> policy allows it), so the site works even before the static token is set — the
> token just gives it an explicit credential and unlocks draft/preview reads.

Then enable the **Visual Editor** in the Studio (two parts):

1. **Settings → Settings → Modules** → toggle **Visual Editor** on (it then shows
   in the left module bar).
2. **Settings → Visual Editor** → add the **preview entry URL** so the page loads
   in Next draft mode (the edit overlays only mount in preview):

   ```text
   https://example.com/api/preview?secret=<DIRECTUS_PREVIEW_SECRET>&redirect=/
   ```

Both CSP directions are already wired: the site lists the Studio origin in its
`frame-ancestors` (`apps/web/next.config.ts`), and Directus lists the site origin
in `CONTENT_SECURITY_POLICY_DIRECTIVES__FRAME_SRC` (the `cms` service), so the
Studio can embed the site. `CACHE_AUTO_PURGE=true` makes saved edits show up
immediately.

Verify:

- `https://example.com` loads (see note on first-render below).
- `https://cms.example.com` logs in over HTTPS.
- Submitting the contact form creates a `contact_submissions` row (visible in the Studio).
- Editing an element inside the Studio's Visual Editor iframe saves and the preview refreshes.

> **Rendering note:** the homepage is `force-dynamic`, so it renders at request
> time reading the CMS over the internal network (`CMS_INTERNAL_URL`). Content is
> correct from the first request — there's no build-time CMS dependency and no
> empty-prerender window.

---

## 6a. Authentik (CRM identity provider)

Authentik runs **in this same stack** (services `authentik-server`, `authentik-worker`,
`authentik-redis`) against an `authentik` database in the existing postgres
container, and is published by Caddy at `AUTH_DOMAIN`. It's the OIDC login for the
CRM. The image is the public `ghcr.io/goauthentik/server` — no CI build; Dockhand
pulls it on deploy like any other image.

**1. DNS** — add an A record `auth.example.com` → the VPS IP (same as the others).

**2. Env** — set `AUTH_DOMAIN` in `deploy/deploy.env` (non-secret). In **Dockhand's
secret store** add `AUTHENTIK_SECRET_KEY` (`openssl rand -base64 60`),
`AUTHENTIK_BOOTSTRAP_PASSWORD` (the akadmin password), and `AUTHENTIK_BOOTSTRAP_TOKEN`
(`openssl rand -hex 32`). Authentik reuses `POSTGRES_USER`/`POSTGRES_PASSWORD` for
its DB connection.

**3. Create the `authentik` database** — the multi-DB init script only runs on a
**fresh** postgres volume. Your prod DB already exists, so create it once by hand
(idempotent — safe to re-run):

```bash
# Address the postgres container directly. Local socket connections use `trust`
# auth, so `-U postgres` needs no password and no env-file — fully self-contained.
# Match by compose service label (works whatever the project name is).
PG=$(docker ps -qf label=com.docker.compose.service=postgres)
docker exec "$PG" \
  psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='authentik'" \
  | grep -q 1 || \
docker exec "$PG" \
  psql -U postgres -c "CREATE DATABASE authentik"
```

> Using `docker exec` against the container (not `docker compose … --env-file`)
> sidesteps the old footgun where a sourced `.env.production` or a stray shell var
> would override compose's `${VAR}` interpolation and poison Postgres auth. The env
> now lives in Dockhand, and `-U postgres` on the local socket needs no creds at all.

(On a brand-new VPS with an empty volume, skip this — the init script creates it.)

**4. Bring the stack up** — the next tagged release deploys Authentik automatically
via Dockhand. To do it immediately, trigger a **redeploy from Dockhand** (or POST
its webhook); Dockhand pulls the images and runs `compose up -d`.

Authentik applies its own schema migrations on first start, and the
`AUTHENTIK_BOOTSTRAP_*` values create the `akadmin` superuser + an API token on the
fresh `authentik` DB. Confirm: `https://auth.example.com` loads and you can log in
as `akadmin`.

**5. Register the prod `crm` application** — run the setup script against the prod
Authentik (from your laptop or the VPS), using the bootstrap token. This creates a
**separate `crm` app** (the dev sandbox uses `crm-dev`), with the prod redirect URI:

```bash
AUTHENTIK_URL=https://auth.example.com \
AUTHENTIK_API_TOKEN=<AUTHENTIK_BOOTSTRAP_TOKEN> \
APP_SLUG=crm APP_NAME="CRM" \
CRM_REDIRECT_URIS=https://crm.example.com/api/auth/callback/authentik \
python3 scripts/setup-authentik-crm.py
```

It prints the OIDC coordinates (issuer `https://auth.example.com/application/o/crm/`,
client id/secret) to paste into crm-api/crm-web env **when you deploy the CRM apps**
(a later milestone — Authentik is ready and waiting). See
[`docs/authentik-oidc-milestone.md`](docs/authentik-oidc-milestone.md).

> **Network note:** Caddy publishes `9000` for `auth.` the same way it publishes
> the site (`3000`) and CMS (`8055`) — HTTP on a custom port, fronted by the
> Pangolin/Newt edge that terminates TLS. No `ufw` change beyond what the site
> already needs.
>
> Two edge gotchas that both look like "Authentik is healthy but the login page
> won't load" (the UI shell renders, then shows _"The request failed and the
> interceptors did not return an alternative response"_):
>
> 1. **The Pangolin resource for `auth.` must be PUBLIC.** Authentik _is_ the
>    identity provider, so it can't sit behind Pangolin's own resource-auth gate —
>    otherwise the edge 302-redirects the SPA's `/api/*` calls to its login portal
>    (a different origin), the fetch fails cross-origin, and you get the interceptor
>    error. Disable authentication on that resource in the Pangolin dashboard.
> 2. **Caddy must forward `X-Forwarded-Proto https` to Authentik.** TLS is terminated
>    upstream, so Caddy sees plain HTTP and would otherwise tell Authentik
>    `scheme=http`. Authentik then builds its CSP / redirect URLs for `http://`, and
>    the browser (on `https://`) blocks the SPA's own API fetch. The `auth.` block in
>    [`Caddyfile`](Caddyfile) sets this header — keep it. Verify with:
>    `curl -sSI https://auth.example.com/ | grep -i location` → should be
>    `/flows/-/default/authentication/`, **not** the Pangolin portal; and the
>    `content-security-policy` response header should reference `https://`.

---

## 6b. CRM apps (crm-web + crm-api)

The CRM dashboard (`crm-web`, Next.js) is published by Caddy at `CRM_DOMAIN`
(`quanly.dichvuyan.com`). Its backend (`crm-api`, FastAPI) is **internal-only** —
it has no `ports:` block and no Caddy route, so it's reachable solely on the
docker network. crm-web calls it server-side at `http://crm-api:8000`; the
browser never does. Both images are built + pushed by CI (`crm-web`, `crm-api`);
CI pins them in `deploy/deploy.env` alongside `web`, and Dockhand deploys them.

**1. DNS** — add an A record `quanly.dichvuyan.com` → the VPS IP, and (like the
others) front it with a **public** Pangolin resource on port `3002`.

**2. Create the `crm` database** — `crm-api` runs Alembic migrations on start, but
the database itself must exist first. As with `authentik` (§6a), the multi-DB init
script only runs on a **fresh** volume, so create it once by hand (idempotent):

```bash
PG=$(docker ps -qf label=com.docker.compose.service=postgres)
docker exec "$PG" \
  psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='crm'" \
  | grep -q 1 || \
docker exec "$PG" \
  psql -U postgres -c "CREATE DATABASE crm"
```

(Brand-new VPS with an empty volume: skip — the init script creates it.)

**3. Env** — set `CRM_DOMAIN` and `CRM_OIDC_CLIENT_ID` in `deploy/deploy.env`
(non-secret); in **Dockhand's secret store** add `CRM_AUTH_SECRET`
(`openssl rand -hex 32`, the Auth.js session secret) and `CRM_OIDC_CLIENT_SECRET`.
The client id/secret come from the
prod `crm` Authentik app registered in §6a step 5 — the **same** client id is used
twice: as crm-web's provider id (`AUTH_AUTHENTIK_ID`) and as crm-api's token
audience (`OIDC_AUDIENCE`). The issuer is derived from `AUTH_DOMAIN` in
[`docker-compose.prod.yml`](docker-compose.prod.yml), so no separate issuer var.

**4. Redirect URI** — the prod `crm` Authentik app's redirect URI must be
`https://quanly.dichvuyan.com/api/auth/callback/authentik`. If it was registered
with a placeholder, re-run the setup script (§6a step 5) with
`CRM_REDIRECT_URIS=https://quanly.dichvuyan.com/api/auth/callback/authentik`.

**5. Bring up** — the next tagged release deploys both apps automatically (Dockhand
pulls + `up -d`). Confirm `https://quanly.dichvuyan.com` redirects to Authentik
login, and after sign-in the dashboard's data loads (crm-api answering over the
internal network).

> **Why `X-Forwarded-Proto https` for `quanly.` too:** same root cause as Authentik
> (§6a) — TLS terminates upstream, so Caddy sees plain HTTP. Without forcing the
> real scheme, Auth.js builds its OAuth callback URL and session cookies for
> `http://`, and the Authentik round-trip fails. The `crm.`/`CRM_DOMAIN` block in
> [`Caddyfile`](Caddyfile) sets it; `AUTH_TRUST_HOST=true` makes Auth.js honor it.

---

## 7. Ongoing deploys

Just cut a new tag. The repo uses `vX.Y.Z` tags, and pushing one triggers the
full build → bump `release` → trigger-Dockhand pipeline. Use the helper script so
you never have to look up the last tag — it reads the latest `vX.Y.Z`, bumps the
requested part (resetting lower parts to 0), then tags and pushes:

```bash
bun run release:fix       # 0.5.8 -> 0.5.9   patch  (bug fix)
bun run release:feat      # 0.5.8 -> 0.6.0   minor  (new feature)
bun run release:release   # 0.5.8 -> 1.0.0   major  (release)
```

The script (`scripts/release.sh`) runs `git fetch --tags` first so it bumps from
the true latest tag, and accepts `--dry-run` (`-n`) to preview without pushing:

```bash
./scripts/release.sh feat --dry-run   # prints "latest: v0.5.8 -> next: v0.6.0 (feat)"
```

Or tag by hand if you need a specific version:

```bash
git tag v1.1.0 && git push origin v1.1.0
```

> **Incremental builds:** the `changes` job diffs the new tag against the
> previous one. An app whose dir + shared root files (`package.json`, `bun.lock`,
> `turbo.json`) are unchanged is **not rebuilt** — its previous image is re-tagged
> to the new release via `docker buildx imagetools` (registry-side, seconds). So
> a web-only change won't rebuild the CRM images, and vice-versa. (If the previous
> image is missing, it falls back to a full build.) The CMS is never built — its
> pinned `directus/directus` image is just pulled on deploy.

**Rollback** — three ways, pick by urgency:

- **Re-run a previous release's workflow** (Actions → select run → Re-run) — it
  re-points `release` at that tag's images and re-triggers Dockhand.
- **In Dockhand**, edit the stack's `*_IMAGE` env to the older `vX.Y.Z` and
  redeploy (a hot override; note the next release re-force-pushes `release`).
- **Point the `release` branch** back at an older release commit and hit the
  webhook (or Dockhand's redeploy).

> **Rolling back across the Payload → Directus cutover** is different from an
> ordinary image rollback: redeploy the **pre-migration tag**, whose compose still
> references the Payload CMS image + the legacy `cms` database (left intact). The
> `directus` database and its uploads volume are untouched, so you can roll
> forward again later.

---

## 8. Backups

Address the postgres container directly (`docker exec`), so backups don't depend
on a compose env-file (Dockhand owns the env now, not `.env.production`). Local
socket connections use `trust` auth, so `-U postgres` needs no password. Match the
container/volume by compose **label** rather than a hardcoded name, so it works
whatever the project is named (`green-orange` vs a folder-derived `yan-portf`).

```bash
# Postgres — nightly dump per database (add to the deploy user's crontab).
# Directus content lives in the `directus` DB; the CRM in `crm`.
# `pg_dumpall` is simplest if you'd rather grab everything in one shot.
0 3 * * * docker exec "$(docker ps -qf label=com.docker.compose.service=postgres)" pg_dump -U postgres directus  | gzip > /root/backups/directus-$(date +\%F).sql.gz
5 3 * * * docker exec "$(docker ps -qf label=com.docker.compose.service=postgres)" pg_dump -U postgres authentik | gzip > /root/backups/authentik-$(date +\%F).sql.gz
8 3 * * * docker exec "$(docker ps -qf label=com.docker.compose.service=postgres)" pg_dump -U postgres crm       | gzip > /root/backups/crm-$(date +\%F).sql.gz

# Uploaded files live in the `media` named volume (mounted at /directus/uploads) —
# back it up too. Resolve the volume by label (name is <project>_media):
VOL=$(docker volume ls -qf label=com.docker.compose.volume=media)
docker run --rm -v "$VOL":/data -v /root/backups:/backup alpine \
  tar czf /backup/media-$(date +%F).tar.gz -C /data .
```

Restore: `gunzip -c dump.sql.gz | docker exec -i "$(docker ps -qf label=com.docker.compose.service=postgres)" psql -U postgres directus`.

> These labels are set by Compose on every container/volume it creates, so they
> hold regardless of the project name. Sanity-check with `docker ps` /
> `docker volume ls` if a match comes back empty.

---

## 9. Schema changes (data model)

The Directus data model is committed as a snapshot at
`apps/cms/snapshots/snapshot.yaml` and re-applied on every container start. When
you change the model, update that snapshot and commit it:

```bash
# locally, against your dev Directus (collections edited in Studio or via build-schema)
docker exec <local-cms-container> npx directus schema snapshot --yes /directus/snapshots/snapshot.yaml
git add apps/cms/snapshots/snapshot.yaml && git commit
```

On the next deploy the CMS container runs `directus schema apply` against the
committed snapshot automatically (idempotent — a no-op when nothing changed).

> **Note:** `schema apply` covers collections/fields/relations only — **not**
> roles, permissions, or content. Access changes go through `apps/cms` →
> `bun run setup-access` (see §6); content through `bun run seed`.

---

## Notes / optional hardening

- **`PUBLIC_URL`:** Directus needs `DIRECTUS_PUBLIC_URL=https://cms.<domain>` set
  (it builds absolute asset/admin URLs and OAuth redirects from it). It's set in
  `deploy/deploy.env` and passed to the container in `docker-compose.prod.yml`.
- **Machine user:** instead of a personal PAT on the VPS, use a dedicated GitHub
  machine user with read-only package access.
- **Postgres is internal-only** (no published port); keep it that way.
- `apps/web/next.config.ts` pins `turbopack.root` to the monorepo root, so builds
  are unaffected by stray lockfiles.
