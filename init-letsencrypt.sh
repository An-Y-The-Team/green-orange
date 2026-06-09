#!/usr/bin/env bash
#
# One-time TLS bootstrap for the production stack. Creates temporary self-signed
# certs so nginx can start, then replaces them with real Let's Encrypt certs via
# the HTTP-01 webroot challenge. Run once on the VPS after DNS points at it:
#
#   ./init-letsencrypt.sh
#
# Re-running is safe (it force-renews). Renewals after this are automatic via
# the `certbot` service in the compose file.
set -euo pipefail

# ─── EDIT THESE ────────────────────────────────────────────────────────────
EMAIL="you@example.com"          # for Let's Encrypt expiry notices
STAGING=0                         # set to 1 while testing (avoids rate limits)

# Map of certificate name → domains it should cover (space-separated).
# The names MUST match the live/<name> paths referenced in nginx/conf.d/*.conf.
declare -A CERTS=(
  ["example.com"]="example.com www.example.com"
  ["cms.example.com"]="cms.example.com"
)
# ─────────────────────────────────────────────────────────────────────────────

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"
RSA_KEY_SIZE=4096
DATA_PATH="/etc/letsencrypt"

echo "### Creating temporary self-signed certificates so nginx can boot…"
for name in "${!CERTS[@]}"; do
  $COMPOSE run --rm --entrypoint "\
    sh -c 'mkdir -p $DATA_PATH/live/$name && \
      openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1 \
        -keyout $DATA_PATH/live/$name/privkey.pem \
        -out $DATA_PATH/live/$name/fullchain.pem \
        -subj \"/CN=localhost\"'" certbot
done

echo "### Starting nginx…"
$COMPOSE up -d nginx

STAGING_ARG=""
[ "$STAGING" != "0" ] && STAGING_ARG="--staging"

for name in "${!CERTS[@]}"; do
  echo "### Requesting Let's Encrypt certificate for: ${CERTS[$name]}"
  DOMAIN_ARGS=""
  for d in ${CERTS[$name]}; do DOMAIN_ARGS="$DOMAIN_ARGS -d $d"; done

  # Remove the dummy cert so certbot writes a clean structure.
  $COMPOSE run --rm --entrypoint "\
    sh -c 'rm -rf $DATA_PATH/live/$name $DATA_PATH/archive/$name $DATA_PATH/renewal/$name.conf'" certbot

  $COMPOSE run --rm --entrypoint "\
    certbot certonly --webroot -w /var/www/certbot $STAGING_ARG \
      $DOMAIN_ARGS \
      --email $EMAIL --rsa-key-size $RSA_KEY_SIZE \
      --agree-tos --no-eff-email --force-renewal" certbot
done

echo "### Reloading nginx with the new certificates…"
$COMPOSE exec nginx nginx -s reload

echo "### Done. HTTPS should now be live."
