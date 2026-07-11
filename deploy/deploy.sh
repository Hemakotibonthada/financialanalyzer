#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# FinancialAnalyzer — one-shot production deploy for a fresh Ubuntu VM
# (tested target: Oracle Cloud Always-Free ARM, Ubuntu 22.04).
#
# Usage (from the repo root, as root or with sudo):
#   sudo DOMAIN=finserve.circuvent.com ACME_EMAIL=you@example.com bash deploy/deploy.sh
#
# Idempotent: safe to re-run to redeploy after `git pull`. Secrets in .env.prod
# are generated once and preserved across runs.
# ------------------------------------------------------------------------------

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

DOMAIN="${DOMAIN:-}"
ACME_EMAIL="${ACME_EMAIL:-}"

if [[ -z "$DOMAIN" || -z "$ACME_EMAIL" ]]; then
  echo "ERROR: DOMAIN and ACME_EMAIL are required."
  echo "  sudo DOMAIN=finserve.circuvent.com ACME_EMAIL=you@example.com bash deploy/deploy.sh"
  exit 1
fi

echo "==> [1/5] Installing Docker (if missing)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
if ! docker compose version >/dev/null 2>&1; then
  apt-get update -y && apt-get install -y docker-compose-plugin
fi

echo "==> [2/5] Opening host firewall for TCP 80/443"
# Oracle's Ubuntu images ship a restrictive iptables INPUT chain. (You STILL must
# allow 80/443 ingress in the Oracle Security List / VCN — see deploy/README.md.)
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

ENV_FILE="$REPO_DIR/.env.prod"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "==> [3/5] Generating .env.prod with fresh secrets"
  gen() { openssl rand -hex 32; }
  cat > "$ENV_FILE" <<EOF
DOMAIN=$DOMAIN
ACME_EMAIL=$ACME_EMAIL
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
  echo "==> [3/5] Reusing existing .env.prod (secrets preserved)"
  sed -i "s|^DOMAIN=.*|DOMAIN=$DOMAIN|" "$ENV_FILE"
  sed -i "s|^ACME_EMAIL=.*|ACME_EMAIL=$ACME_EMAIL|" "$ENV_FILE"
fi

echo "==> [4/5] Building and starting the stack (first build ~5-8 min)"
docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml up -d --build

echo "==> [5/5] Status"
sleep 5
docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml ps

cat <<EOF

==============================================================
 Deploy complete.

   App:     https://$DOMAIN
   Health:  https://$DOMAIN/api/health

 First HTTPS hit may take ~30-60s while Caddy obtains a
 Let's Encrypt certificate. Watch logs with:

   docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f caddy

 Checklist if it doesn't load:
   1. DNS: $DOMAIN A-record -> this server's public IP (dig $DOMAIN)
   2. Oracle Security List / VCN allows ingress TCP 80 and 443
   3. Host firewall opened (this script handles iptables)
==============================================================
EOF
