# Deployment — Self-hosted VPS (Docker Compose + GitHub Actions)

Build images on **GitHub Actions**, push to **GHCR** (private), and **SSH-deploy**
to a single VPS running everything in Docker Compose: Postgres + CMS + web behind
nginx with Let's Encrypt TLS.

```
push tag vX.Y.Z ─► GitHub Actions ─► build web+cms (amd64) ─► GHCR
                                                                │
                          SSH ◄──── deploy job ────────────────┘
                          git pull · compose pull · up -d · (cms runs migrate)

VPS:  nginx(443) ─► web:3000           ┌ Postgres (internal, volume: pgdata)
                 └► cms:3001 ──────────┘ uploads (volume: media)
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

> Replace `example.com` / `OWNER` throughout with your real domain / GitHub owner.

---

## 2. GitHub configuration (one-time)

**Repo → Settings → Secrets and variables → Actions**

Secrets:
| Name | Value |
|------|-------|
| `VPS_HOST` | VPS IP or hostname |
| `VPS_USER` | deploy user (e.g. `deploy`) |
| `VPS_SSH_KEY` | private key whose public half is in the VPS user's `~/.ssh/authorized_keys` |
| `VPS_PORT` | SSH port (optional, defaults to 22) |
| `VPS_PATH` | repo path on the VPS, e.g. `/opt/yan-portf` |

Variables:
| Name | Value |
|------|-------|
| `NEXT_PUBLIC_CMS_URL` | `https://cms.example.com` (baked into the web image at build) |

GHCR push uses the built-in `GITHUB_TOKEN` — no extra token needed for the build side.

---

## 3. VPS first-time setup

```bash
# As root: install Docker + compose plugin
curl -fsSL https://get.docker.com | sh

# Create a deploy user and add to docker group
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
# add your CI public key to /home/deploy/.ssh/authorized_keys

# Firewall: only SSH + HTTP + HTTPS
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
```

As the `deploy` user:

```bash
sudo mkdir -p /opt/yan-portf && sudo chown deploy:deploy /opt/yan-portf
git clone https://github.com/OWNER/yan-portf.git /opt/yan-portf
cd /opt/yan-portf

# Production env
cp .env.production.example .env.production
# Edit it: set a strong POSTGRES_PASSWORD, a fresh PAYLOAD_SECRET
#   (openssl rand -hex 32), and CORS_ORIGINS=https://example.com,https://www.example.com
nano .env.production

# Log in to GHCR so the VPS can PULL the private images.
# Use a fine-grained PAT (or classic with read:packages ONLY) — pull-only.
echo "<YOUR_GHCR_PAT>" | docker login ghcr.io -u OWNER --password-stdin
```

Point the nginx configs and cert script at your real domains:

```bash
# Replace example.com / cms.example.com in both server blocks
sed -i 's/example\.com/yourdomain.com/g' nginx/conf.d/web.conf nginx/conf.d/cms.conf
# (the cms.conf subdomain becomes cms.yourdomain.com — verify it)
nano nginx/conf.d/web.conf nginx/conf.d/cms.conf

# Edit EMAIL and the CERTS map (domain names) at the top of the script
nano init-letsencrypt.sh
```

---

## 4. Issue TLS certificates (one-time)

DNS must already resolve to the VPS. Then:

```bash
# Set WEB_IMAGE/CMS_IMAGE in .env.production to any pushed tag first, or run a
# manual first deploy (section 5) so the images exist — nginx/certbot only need
# the compose file, but `up -d` later needs the app images.
./init-letsencrypt.sh
```

This creates temporary certs, starts nginx, completes the HTTP-01 challenge, and
swaps in real Let's Encrypt certs. Renewals are automatic (the `certbot` service
renews twice daily; nginx reloads every 6h). Tip: set `STAGING=1` in the script
for a dry run to avoid rate limits, then re-run with `STAGING=0`.

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

> **First-render note:** the web image is built in CI where the CMS isn't
> reachable, so the homepage prerenders with empty content and fills in on the
> first runtime revalidation (ISR, 5 min). To force-populate immediately after
> deploy, `docker compose restart web` once the CMS is up, or hit the page once.

---

## 7. Ongoing deploys

Just cut a new tag:
```bash
git tag v1.1.0 && git push origin v1.1.0
```

**Rollback** — redeploy a previous tag by re-running that release's workflow
(Actions → select run → Re-run), or on the VPS:
```bash
sed -i 's|^WEB_IMAGE=.*|WEB_IMAGE=ghcr.io/owner/yan-portf-web:v1.0.0|' .env.production
sed -i 's|^CMS_IMAGE=.*|CMS_IMAGE=ghcr.io/owner/yan-portf-cms:v1.0.0|' .env.production
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

---

## 8. Backups

```bash
# Postgres — nightly dump (add to deploy user's crontab)
0 3 * * * docker compose -f /opt/yan-portf/docker-compose.prod.yml --env-file /opt/yan-portf/.env.production \
  exec -T postgres pg_dump -U postgres cms | gzip > /opt/backups/cms-$(date +\%F).sql.gz

# Media uploads live in the `media` named volume — back it up too:
docker run --rm -v yan-portf_media:/data -v /opt/backups:/backup alpine \
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
  which work behind nginx. Set one via env if you need absolute media/admin URLs.
- **Machine user:** instead of a personal PAT on the VPS, use a dedicated GitHub
  machine user with read-only package access.
- **Postgres is internal-only** (no published port); keep it that way.
- Both `next.config.ts` pin `turbopack.root` to the monorepo root, so builds are
  unaffected by stray lockfiles.
