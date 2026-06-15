# Deployment — Self-hosted VPS (Docker Compose + GitHub Actions)

Build images on **GitHub Actions**, push to **GHCR** (private), and **SSH-deploy**
to a single VPS running everything in Docker Compose: Postgres + CMS + web behind
**Caddy** with automatic Let's Encrypt TLS.

```bash
push tag vX.Y.Z ─► GitHub Actions ─► build web+cms (amd64) ─► GHCR
                                                                │
                          SSH ◄──── deploy job ────────────────┘
                          git pull · compose pull · up -d · (cms runs migrate)

VPS:  caddy(443) ─► web:3000           ┌ Postgres (internal, volume: pgdata)
                 └► cms:3001 ──────────┘ uploads (volume: media)
      (auto-HTTPS; certs persist in volume: caddy_data)
```

The VPS never builds — it only pulls finished images, so a small (1–2 GB) box is fine.

---

## 1. Prerequisites

- A VPS (Ubuntu 22.04+, **amd64**) with a public IP.
- A domain. Two DNS **A** records pointing at the VPS IP:
  - `example.com` (and `www.example.com`) → site
  - `cms.example.com` → Payload admin/API
- Docker Engine + Compose plugin on the VPS.
- This repo pushed to GitHub.

> **Network model:** the public site + CMS stay public on **80/443** (served by
> Caddy). **SSH (22) is NOT public** — it's reachable only over the **Pangolin**
> network. CI therefore joins that network (Olm client) before deploying. See
> §2a.
>
> Repo: `An-Y-The-Team/green-orange` → images publish to
> `ghcr.io/an-y-the-team/green-orange-{web,cms}`. Replace `example.com` throughout
> with your real domain.

---

## 2. GitHub configuration (one-time)

### Repo → Settings → Secrets and variables → Actions

Secrets:

| Name                | Value                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `VPS_HOST`          | The VPS's **Pangolin** resource alias, e.g. `ssh.newt-01` (NOT the public IP)                |
| `VPS_USER`          | deploy user (e.g. `root`)                                                                    |
| `VPS_SSH_KEY`       | private key whose public half is in the VPS user's `~/.ssh/authorized_keys`                  |
| `VPS_PORT`          | SSH port (optional, defaults to 22)                                                          |
| `VPS_PATH`          | repo path on the VPS, e.g. `/root/green-orange`                                              |
| `PANGOLIN_ID`       | Pangolin client ID (used by `pangolin up --id`)                                              |
| `PANGOLIN_SECRET`   | Pangolin client secret (`pangolin up --secret`)                                              |
| `PANGOLIN_ENDPOINT` | Pangolin control URL, e.g. `https://prp.hdc-cloud.org`                                       |
| `VPS_PANGOLIN_IP`   | The VPS resource's **Pangolin tunnel IP** (e.g. `100.96.144.8`). See §2a for how to find it. |

Variables:

| Name                  | Value                                                         |
| --------------------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_CMS_URL` | `https://cms.example.com` (baked into the web image at build) |

GHCR push uses the built-in `GITHUB_TOKEN` — no extra token needed for the build side.

---

## 2a. Pangolin access for CI (private SSH)

The VPS's SSH isn't public, so the deploy job joins the Pangolin network with the
`pangolin` client before connecting — the same command you run locally:

```bash
pangolin up --id <CLIENT_ID> --secret <CLIENT_SECRET> --endpoint https://prp.hdc-cloud.org
```

In Pangolin: the VPS is a **Site** (Newt agent) and its SSH is exposed as a
client-resource reachable at the alias **`ssh.newt-01`** (port 22). Register a
**Client** for CI to get the id/secret, then set the GitHub secrets:

- `PANGOLIN_ID`, `PANGOLIN_SECRET`, `PANGOLIN_ENDPOINT` (`https://prp.hdc-cloud.org`)
- `VPS_HOST` = `ssh.newt-01`, `VPS_PORT` = `22`

### Finding `VPS_PANGOLIN_IP`

The Pangolin Olm CLI's DNS proxy does not reliably resolve resource aliases in
headless/CI environments. The workflow bypasses DNS by SSHing directly to the
resource's **tunnel IP** (`VPS_PANGOLIN_IP`). To find it, check the Newt agent
logs on the VPS:

```bash
sudo journalctl -u newt --no-pager -n 50 | grep 'original:'
# Example output:
#   TCP Forwarder: Using rewritten destination 127.0.0.1 (original: 100.96.144.8)
#                                                          ^^^^^^^^^^^^^^^^
# VPS_PANGOLIN_IP = 100.96.144.8
```

Set this as the `VPS_PANGOLIN_IP` GitHub secret.

The workflow's **"Connect to Pangolin and deploy"** step (one step):

1. Installs the CLI (`get-cli.sh`).
2. `sudo pangolin up … --override-dns --attach &` — foreground mode, backgrounded
   with output redirected to a log. `--attach` keeps logging to the file (the
   default daemonize mode fails without a TTY).
3. Waits for `WireGuard device created` in that log.
4. Uses `VPS_PANGOLIN_IP` to SSH directly through the WireGuard tunnel (no DNS).
   Falls back to alias resolution via `getent hosts` if `VPS_PANGOLIN_IP` is unset.

Everything is one step so the tunnel stays up for the whole deploy.

> ⚠️ Rotate the client secret if it has ever been shared in plaintext. If
> `VPS_PANGOLIN_IP` changes (rare — check after Pangolin server upgrades or
> resource re-creation), update the secret.

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

### CI deploy SSH key

**On your LOCAL machine** (not the VPS), generate a dedicated key pair for CI
(no passphrase so the runner can use it non-interactively):

```bash
ssh-keygen -t ed25519 -C "green-orange-ci" -f ./deploy_key -N ""
# → deploy_key       (PRIVATE — goes into the GitHub secret VPS_SSH_KEY)
# → deploy_key.pub   (PUBLIC  — goes onto the VPS, below)

cat ./deploy_key.pub             # copy this whole line for the next step
```

Install the **public** key for the `deploy` user **on the VPS** (run as root via
your Pangolin tunnel or the provider console). The `>>` creates the file if it
doesn't exist, so do it in this order:

```bash
mkdir -p /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
echo "ssh-ed25519 AAAA...paste deploy_key.pub here... green-orange-ci" \
  >> /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

Then put the **private** key into the repo secret (back on your local machine):

```bash
pbcopy < ./deploy_key            # macOS — copies the whole key incl. BEGIN/END
# Paste it as the value of the GitHub secret  VPS_SSH_KEY, then:
rm ./deploy_key                  # delete the local private key
```

> Private key → GitHub secret `VPS_SSH_KEY`. Public key → VPS
> `~/.ssh/authorized_keys`. (Reversing these is the most common mistake.)

As the `deploy` user:

```bash
sudo mkdir -p /root/green-orange && sudo chown deploy:deploy /root/green-orange
git clone https://github.com/An-Y-The-Team/green-orange.git /root/green-orange
cd /root/green-orange

# Production env
cp .env.production.example .env.production
# Edit it: set a strong POSTGRES_PASSWORD, a fresh PAYLOAD_SECRET
#   (openssl rand -hex 32), CORS_ORIGINS, and the Caddy domains
#   (SITE_DOMAIN / CMS_DOMAIN / ACME_EMAIL).
nano .env.production

# Log in to GHCR so the VPS can PULL the private images. Authenticate with YOUR
# personal GitHub username (a member of the An-Y-The-Team org) + a fine-grained
# PAT (or classic with read:packages ONLY) that can read the org's packages.
echo "<YOUR_GHCR_PAT>" | docker login ghcr.io -u <your-github-username> --password-stdin
```

There are **no proxy config files to edit** — Caddy reads `SITE_DOMAIN`,
`CMS_DOMAIN`, and `ACME_EMAIL` from the environment via the `Caddyfile`.

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

Two options:

**A. Cut a release (recommended)** — this triggers the full pipeline:

```bash
git tag v1.0.0 && git push origin v1.0.0
```

GitHub builds both images, pushes to GHCR, and SSHes in to deploy.

**B. Manual first deploy on the VPS** (e.g. to have images present before TLS):

```bash
# After at least one successful build job has pushed images to GHCR:
# set WEB_IMAGE / CMS_IMAGE in .env.production to that tag, then:
docker compose -f docker-compose.prod.yml --env-file .env.production pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

The CMS container runs `payload migrate` automatically on startup, creating the
schema on a fresh database.

---

## 6. Post-deploy

```bash
# Create the first admin user
open https://cms.example.com/admin   # follow the create-first-user prompt

# (Optional) seed the demo content into production
docker compose -f docker-compose.prod.yml --env-file .env.production exec cms \
  /app/node_modules/.bin/payload run apps/cms/src/seed.ts   # path is relative to /app/apps/cms
```

Verify:

- `https://example.com` loads (see note on first-render below).
- `https://cms.example.com/admin` logs in over HTTPS.
- Submitting the contact form creates a row under **Leads → Contact Submissions**.

> **Rendering note:** the homepage is `force-dynamic`, so it renders at request
> time reading the CMS over the internal network (`CMS_INTERNAL_URL`). Content is
> correct from the first request — there's no build-time CMS dependency and no
> empty-prerender window.

---

## 6a. Authentik (CRM identity provider)

Authentik runs **in this same stack** (services `authentik-server`, `authentik-worker`,
`authentik-redis`) against an `authentik` database in the existing postgres
container, and is published by Caddy at `AUTH_DOMAIN`. It's the OIDC login for the
CRM. The image is the public `ghcr.io/goauthentik/server` — no CI build, the deploy
job's `compose pull` fetches it like any other image.

**1. DNS** — add an A record `auth.example.com` → the VPS IP (same as the others).

**2. Env** — in `.env.production`, set `AUTH_DOMAIN`, a fresh `AUTHENTIK_SECRET_KEY`
(`openssl rand -base64 60`), an `AUTHENTIK_BOOTSTRAP_PASSWORD` (the akadmin
password), and an `AUTHENTIK_BOOTSTRAP_TOKEN` (`openssl rand -hex 32`). Authentik
reuses `POSTGRES_USER`/`POSTGRES_PASSWORD` for its DB connection.

**3. Create the `authentik` database** — the multi-DB init script only runs on a
**fresh** postgres volume. Your prod DB already exists, so create it once by hand
(idempotent — safe to re-run):

```bash
cd "$VPS_PATH"   # e.g. /root/green-orange
# Run psql AS the postgres superuser. Inside the container, local socket
# connections use `trust` auth, so `-U postgres` needs no password and no env
# vars at all — the command is fully self-contained.
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='authentik'" \
  | grep -q 1 || \
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  psql -U postgres -c "CREATE DATABASE authentik"
```

> ⚠️ **Never `source` / `set -a; . ./.env.production` before running compose.** Two
> footguns compound: (1) if any value uses `$(...)` (e.g. a `PASSWORD=$(openssl …)`
> placeholder), sourcing **executes** it, silently producing a throwaway value; and
> (2) shell environment variables **override** `--env-file` during compose's `${VAR}`
> interpolation — so that poisoned value gets injected into the containers instead of
> the file's real one. This is exactly what broke Postgres auth during the initial
> Authentik bring-up. Let compose read `--env-file` itself; use `-U postgres` for psql.

(On a brand-new VPS with an empty volume, skip this — the init script creates it.)

**4. Bring the stack up** — the next tagged release deploys Authentik automatically.
To do it immediately on the VPS:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

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
> `3000`/`3001` for the site/CMS (HTTP on a custom port, fronted by the Pangolin/Newt
> edge that terminates TLS). No `ufw` change beyond what the site already needs.
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
browser never does. Both images are built + pushed by CI (`crm-web`, `crm-api`)
and pinned by the deploy job alongside `web`/`cms`.

**1. DNS** — add an A record `quanly.dichvuyan.com` → the VPS IP, and (like the
others) front it with a **public** Pangolin resource on port `3002`.

**2. Create the `crm` database** — `crm-api` runs Alembic migrations on start, but
the database itself must exist first. As with `authentik` (§6a), the multi-DB init
script only runs on a **fresh** volume, so create it once by hand (idempotent):

```bash
cd "$VPS_PATH"   # e.g. /root/green-orange
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='crm'" \
  | grep -q 1 || \
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  psql -U postgres -c "CREATE DATABASE crm"
```

(Brand-new VPS with an empty volume: skip — the init script creates it. The same
`source ./.env.production` footgun called out in §6a applies here too.)

**3. Env** — in `.env.production`, set `CRM_DOMAIN`, a fresh `CRM_AUTH_SECRET`
(`openssl rand -hex 32`, the Auth.js session secret), and the OIDC client
`CRM_OIDC_CLIENT_ID` / `CRM_OIDC_CLIENT_SECRET`. The client id/secret come from the
prod `crm` Authentik app registered in §6a step 5 — the **same** client id is used
twice: as crm-web's provider id (`AUTH_AUTHENTIK_ID`) and as crm-api's token
audience (`OIDC_AUDIENCE`). The issuer is derived from `AUTH_DOMAIN` in
[`docker-compose.prod.yml`](docker-compose.prod.yml), so no separate issuer var.

**4. Redirect URI** — the prod `crm` Authentik app's redirect URI must be
`https://quanly.dichvuyan.com/api/auth/callback/authentik`. If it was registered
with a placeholder, re-run the setup script (§6a step 5) with
`CRM_REDIRECT_URIS=https://quanly.dichvuyan.com/api/auth/callback/authentik`.

**5. Bring up** — the next tagged release deploys both apps automatically (`compose
pull` + `up -d`). Confirm `https://quanly.dichvuyan.com` redirects to Authentik
login, and after sign-in the dashboard's data loads (crm-api answering over the
internal network).

> **Why `X-Forwarded-Proto https` for `quanly.` too:** same root cause as Authentik
> (§6a) — TLS terminates upstream, so Caddy sees plain HTTP. Without forcing the
> real scheme, Auth.js builds its OAuth callback URL and session cookies for
> `http://`, and the Authentik round-trip fails. The `crm.`/`CRM_DOMAIN` block in
> [`Caddyfile`](Caddyfile) sets it; `AUTH_TRUST_HOST=true` makes Auth.js honor it.

---

## 6c. Interactive Logs (Dozzle)

The stack includes **Dozzle**, a real-time web-based Docker log viewer. It gives you a UI to view and search container logs without SSH-ing into the VPS.

**1. DNS** — add an A record `logs.example.com` (or whatever domain you want) → the VPS IP.
**2. Env** — in `.env.production`, set `LOGS_DOMAIN`.
**3. Secure with Pangolin** — just like the CRM dashboard, you **must** front Dozzle with a public Pangolin resource on port `8080`. Dozzle has no built-in auth in this stack, it relies entirely on Pangolin's zero-trust network for access control. Only authorized users should be able to access the logs dashboard.

---

## 7. Ongoing deploys

Just cut a new tag. The repo uses `vX.Y.Z` tags, and pushing one triggers the
full build → deploy pipeline. Use the helper script so you never have to look up
the last tag — it reads the latest `vX.Y.Z`, bumps the requested part (resetting
lower parts to 0), then tags and pushes:

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
> a CMS-only change won't rebuild the web image, and vice-versa. (If the previous
> image is missing, it falls back to a full build.)

**Rollback** — redeploy a previous tag by re-running that release's workflow
(Actions → select run → Re-run), or on the VPS:

```bash
sed -i 's|^WEB_IMAGE=.*|WEB_IMAGE=ghcr.io/an-y-the-team/green-orange-web:v1.0.0|' .env.production
sed -i 's|^CMS_IMAGE=.*|CMS_IMAGE=ghcr.io/an-y-the-team/green-orange-cms:v1.0.0|' .env.production
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

---

## 8. Backups

```bash
# Postgres — nightly dump per database (add to deploy user's crontab).
# `pg_dumpall` is simplest if you'd rather grab cms + authentik in one shot.
0 3 * * * docker compose -f /root/green-orange/docker-compose.prod.yml --env-file /root/green-orange/.env.production \
  exec -T postgres pg_dump -U postgres cms | gzip > /root/backups/cms-$(date +\%F).sql.gz
5 3 * * * docker compose -f /root/green-orange/docker-compose.prod.yml --env-file /root/green-orange/.env.production \
  exec -T postgres pg_dump -U postgres authentik | gzip > /root/backups/authentik-$(date +\%F).sql.gz

# Media uploads live in the `media` named volume — back it up too:
docker run --rm -v green-orange_media:/data -v /root/backups:/backup alpine \
  tar czf /backup/media-$(date +%F).tar.gz -C /data .
```

Restore: `gunzip -c dump.sql.gz | docker compose ... exec -T postgres psql -U postgres cms`.

---

## 9. Schema changes (migrations)

When you change a Payload collection:

```bash
# locally, against your dev DB
bun run --cwd apps/cms payload migrate:create <name>
git add apps/cms/src/migrations && git commit
```

The new migration ships in the next image and runs automatically on deploy.

---

## Notes / optional hardening

- **`serverURL`:** not set in `payload.config.ts`; Payload uses relative URLs,
  which work behind Caddy. Set one via env if you need absolute media/admin URLs.
- **Machine user:** instead of a personal PAT on the VPS, use a dedicated GitHub
  machine user with read-only package access.
- **Postgres is internal-only** (no published port); keep it that way.
- Both `next.config.ts` pin `turbopack.root` to the monorepo root, so builds are
  unaffected by stray lockfiles.
