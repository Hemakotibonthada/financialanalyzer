#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# FinancialAnalyzer - deploy one environment to a fresh or existing Ubuntu VM
# (tested target: Oracle Cloud Always-Free ARM, Ubuntu 22.04).
#
#   bash deploy/deploy.sh fin    -> https://fin.circuvent.com   (main branch)
#   bash deploy/deploy.sh dev    -> https://dev.circuvent.com   (dev branch)
#
# Both environments share one Caddy edge proxy (it owns :80/:443) but are
# otherwise completely isolated: separate containers, database, Redis and
# volumes. Deploying one never touches the other.
#
# Idempotent: safe to re-run to redeploy after `git pull`. Secrets in
# .env.<env> are generated once and preserved across runs.
#
# Environment overrides:
#   ACME_EMAIL   e-mail for Let's Encrypt (required on first run)
#   PROD_DOMAIN  default fin.circuvent.com
#   DEV_DOMAIN   default dev.circuvent.com
# ------------------------------------------------------------------------------

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

ENV_NAME="${1:-}"
PROD_DOMAIN="${PROD_DOMAIN:-fin.circuvent.com}"
DEV_DOMAIN="${DEV_DOMAIN:-dev.circuvent.com}"
ACME_EMAIL="${ACME_EMAIL:-}"

case "$ENV_NAME" in
  fin|prod|production) ENV_NAME="fin"; DOMAIN="$PROD_DOMAIN" ;;
  dev|develop|staging) ENV_NAME="dev"; DOMAIN="$DEV_DOMAIN" ;;
  *)
    echo "ERROR: first argument must be 'fin' (production) or 'dev' (staging)."
    echo "  bash deploy/deploy.sh fin"
    echo "  bash deploy/deploy.sh dev"
    exit 1
    ;;
esac

ENV_FILE="$REPO_DIR/.env.$ENV_NAME"
EDGE_ENV_FILE="$REPO_DIR/.env.edge"
PROJECT="finanalyzer-$ENV_NAME"

echo "==> Deploying '$ENV_NAME' to https://$DOMAIN"

# ------------------------------------------------------------------------------
echo "==> [1/6] Installing Docker (if missing)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
if ! docker compose version >/dev/null 2>&1; then
  apt-get update -y && apt-get install -y docker-compose-plugin
fi

# ------------------------------------------------------------------------------
echo "==> [2/6] Opening host firewall for TCP 80/443"
# Oracle's Ubuntu images ship a restrictive iptables INPUT chain. (You STILL must
# allow 80/443 ingress in the Oracle Security List / VCN - see deploy/README.md.)
if command -v iptables >/dev/null 2>&1; then
  for p in 80 443; do
    iptables -C INPUT -p tcp --dport "$p" -j ACCEPT 2>/dev/null || iptables -I INPUT 5 -p tcp --dport "$p" -j ACCEPT
  done
  if command -v netfilter-persistent >/dev/null 2>&1; then
    netfilter-persistent save || true
  else
    mkdir -p /etc/iptables && iptables-save > /etc/iptables/rules.v4 || true
  fi
fi

# ------------------------------------------------------------------------------
echo "==> [3/6] Ensuring shared edge network"
docker network inspect circuvent_edge >/dev/null 2>&1 || docker network create circuvent_edge

# ------------------------------------------------------------------------------
gen() { openssl rand -hex 32; }

if [[ ! -f "$ENV_FILE" ]]; then
  echo "==> [4/6] Generating $ENV_FILE with fresh secrets"
  # Secrets are per-environment on purpose: a leaked staging key must not grant
  # anything in production.
  cat > "$ENV_FILE" <<EOF
ENV_NAME=$ENV_NAME
DOMAIN=$DOMAIN
APP_NAME=Financial Analyzer
JWT_SECRET=$(gen)
ENCRYPTION_KEY=$(gen)
SESSION_SECRET=$(gen)
MONGO_ROOT_PASSWORD=$(openssl rand -hex 24)
# ---- Optional integrations (fill later; safe to leave blank) ----
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
SENTRY_DSN=
EOF
  chmod 600 "$ENV_FILE"
else
  echo "==> [4/6] Reusing existing $ENV_FILE (secrets preserved)"
  sed -i "s|^ENV_NAME=.*|ENV_NAME=$ENV_NAME|" "$ENV_FILE"
  sed -i "s|^DOMAIN=.*|DOMAIN=$DOMAIN|" "$ENV_FILE"
  grep -q "^ENV_NAME=" "$ENV_FILE" || echo "ENV_NAME=$ENV_NAME" >> "$ENV_FILE"
fi

# ------------------------------------------------------------------------------
echo "==> [5/6] Starting the shared edge proxy"
if [[ ! -f "$EDGE_ENV_FILE" ]]; then
  if [[ -z "$ACME_EMAIL" ]]; then
    echo "ERROR: ACME_EMAIL is required the first time (Let's Encrypt registration)."
    echo "  sudo ACME_EMAIL=you@example.com bash deploy/deploy.sh $ENV_NAME"
    exit 1
  fi
  cat > "$EDGE_ENV_FILE" <<EOF
ACME_EMAIL=$ACME_EMAIL
PROD_DOMAIN=$PROD_DOMAIN
DEV_DOMAIN=$DEV_DOMAIN
EOF
  chmod 600 "$EDGE_ENV_FILE"
fi

docker compose --env-file "$EDGE_ENV_FILE" -f docker-compose.edge.yml up -d
# Pick up Caddyfile edits on redeploy without dropping issued certificates.
docker exec circuvent-edge caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true

# ------------------------------------------------------------------------------
echo "==> [6/6] Building and starting '$ENV_NAME' (first build ~5-8 min)"
docker compose -p "$PROJECT" --env-file "$ENV_FILE" -f docker-compose.prod.yml up -d --build

sleep 5
docker compose -p "$PROJECT" --env-file "$ENV_FILE" -f docker-compose.prod.yml ps

cat <<EOF

==============================================================
 Deploy complete: $ENV_NAME

   App:     https://$DOMAIN
   Health:  https://$DOMAIN/api/health

 First HTTPS hit may take ~30-60s while Caddy obtains a
 Let's Encrypt certificate. Watch logs with:

   docker logs -f circuvent-edge

 Checklist if it doesn't load:
   1. DNS: $DOMAIN A-record -> this server's public IP (dig $DOMAIN)
   2. Oracle Security List / VCN allows ingress TCP 80 and 443
   3. Host firewall opened (this script handles iptables)
==============================================================
EOF