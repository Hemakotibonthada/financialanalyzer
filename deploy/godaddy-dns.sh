#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Point a subdomain at your server's public IP using the GoDaddy DNS API.
#
# Create a Production API key/secret at: https://developer.godaddy.com/keys
# (Note: GoDaddy restricts API access on some account tiers. If this returns
#  403/authentication errors, add the A-record manually — see deploy/README.md.)
#
# Usage:
#   GODADDY_KEY=xxx GODADDY_SECRET=yyy bash deploy/godaddy-dns.sh circuvent.com finserve [PUBLIC_IP]
# If PUBLIC_IP is omitted, this machine's public IP is auto-detected.
# ------------------------------------------------------------------------------

DOMAIN_ROOT="${1:-}"   # e.g. circuvent.com
SUBDOMAIN="${2:-}"     # e.g. finserve
IP="${3:-}"

: "${GODADDY_KEY:?set GODADDY_KEY}"
: "${GODADDY_SECRET:?set GODADDY_SECRET}"
if [[ -z "$DOMAIN_ROOT" || -z "$SUBDOMAIN" ]]; then
  echo "usage: GODADDY_KEY=.. GODADDY_SECRET=.. bash deploy/godaddy-dns.sh <root-domain> <subdomain> [ip]"
  exit 1
fi

if [[ -z "$IP" ]]; then
  IP="$(curl -fsS https://api.ipify.org)"
  echo "Detected public IP: $IP"
fi

echo "Setting A record: $SUBDOMAIN.$DOMAIN_ROOT -> $IP (TTL 600)"
curl -fsS -X PUT \
  "https://api.godaddy.com/v1/domains/$DOMAIN_ROOT/records/A/$SUBDOMAIN" \
  -H "Authorization: sso-key ${GODADDY_KEY}:${GODADDY_SECRET}" \
  -H "Content-Type: application/json" \
  -d "[{\"data\":\"$IP\",\"ttl\":600}]"

echo
echo "Done. DNS can take a few minutes to propagate. Verify with:"
echo "  dig +short $SUBDOMAIN.$DOMAIN_ROOT"
