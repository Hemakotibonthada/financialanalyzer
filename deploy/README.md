# Deploying FinancialAnalyzer to `finserve.circuvent.com`

A single-VM, fully-Dockerized production deploy with automatic HTTPS.
Target: **Oracle Cloud Always-Free ARM VM** (₹0/month), but any Ubuntu 22.04+ server works.

**Stack:** Caddy (TLS + routing) → nginx (SPA) + Node/Express API + MongoDB + Redis, all in Docker Compose.

---

## What you do vs. what's automated

| Step | Who |
|------|-----|
| Create the Oracle VM + open ports in the cloud firewall | **You** (one-time, clicks) |
| Point DNS `finserve` → server IP | **You** (or `godaddy-dns.sh`) |
| Install Docker, generate secrets, build & run everything, get HTTPS | **Automated** (`deploy.sh`) |
| Redeploy after code changes | `git pull && sudo bash deploy/deploy.sh` |

---

## 1. Create the server (Oracle Cloud — free)

1. Sign up at <https://www.oracle.com/cloud/free/> (needs a card for identity; the *Always Free* resources are not charged).
2. **Compute → Instances → Create instance**:
   - **Image:** Canonical Ubuntu 22.04
   - **Shape:** *Ampere* → `VM.Standard.A1.Flex`, set **2 OCPU / 12 GB** (within Always-Free).
   - **SSH keys:** upload your public key (or let it generate one — download it).
   - Create. Note the **Public IP address**.
   > If Oracle says "out of capacity" for ARM, try a different Availability Domain or region, or retry later — this is common on the free tier.
3. **Open the cloud firewall** (this is separate from the host firewall):
   - Networking → your VCN → Security Lists → default → **Add Ingress Rules**:
     - Source `0.0.0.0/0`, TCP, dest port **80**
     - Source `0.0.0.0/0`, TCP, dest port **443**

## 2. Point the subdomain at the server

**Option A — GoDaddy dashboard (manual, always works):**
`circuvent.com → DNS → Records → Add`:
- Type **A**, Name **finserve**, Value **<your server public IP>**, TTL 600.

**Option B — automated** (from your laptop or the server; needs a GoDaddy API key from <https://developer.godaddy.com/keys>):
```bash
GODADDY_KEY=xxx GODADDY_SECRET=yyy bash deploy/godaddy-dns.sh circuvent.com finserve <PUBLIC_IP>
```

Verify: `dig +short finserve.circuvent.com` should return your IP.

## 3. Deploy

SSH into the server, get the code, and run the one-shot script:

```bash
ssh -i <your-key> ubuntu@<PUBLIC_IP>

# Get the code (private repo → use a GitHub Personal Access Token as the password)
sudo apt-get update -y && sudo apt-get install -y git
git clone https://github.com/Hemakotibonthada/financialanalyzer.git
cd financialanalyzer
git checkout feature/production-deploy   # branch that contains these deploy files

# Deploy (installs Docker, generates secrets, builds, starts, gets HTTPS)
sudo DOMAIN=finserve.circuvent.com ACME_EMAIL=hemakotibonthada@gmail.com bash deploy/deploy.sh
```

First build takes ~5–8 min. When done, open **https://finserve.circuvent.com**
(give Caddy ~30–60s on the very first request to issue the certificate).

## 4. Create your admin account

Register normally at `https://finserve.circuvent.com/register`, then promote yourself:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec mongo \
  mongosh -u root -p "$(grep MONGO_ROOT_PASSWORD .env.prod | cut -d= -f2)" --authenticationDatabase admin \
  financial_analyzer --eval 'db.users.updateOne({email:"you@example.com"},{$set:{role:"admin"}})'
```
Admins get every feature unlocked (no subscription needed for you).

---

## Day-2 operations

```bash
# Redeploy latest code
git pull && sudo bash deploy/deploy.sh

# Logs
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f api
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f caddy

# Restart / stop
docker compose --env-file .env.prod -f docker-compose.prod.yml restart
docker compose --env-file .env.prod -f docker-compose.prod.yml down

# Back up the database
docker compose --env-file .env.prod -f docker-compose.prod.yml exec mongo \
  sh -c 'mongodump -u root -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive' > backup-$(date +%F).archive
```

## Turning on the paid / email features (optional, later)

Edit `.env.prod`, fill the OPTIONAL block, then `sudo bash deploy/deploy.sh` to apply:
- **Email verification & alerts:** set `EMAIL_HOST/PORT/USER/PASSWORD/FROM` (any SMTP; e.g. a Gmail App Password).
- **Real subscriptions:** set `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET` (live keys). Add a webhook in Razorpay → `https://finserve.circuvent.com/api/billing/webhook`.
- **Error tracking:** set `SENTRY_DSN`.

Secrets live only in `.env.prod` on the server (git-ignored, `chmod 600`). Never commit it.

## Security notes
- MongoDB and Redis are **not** exposed to the internet — only reachable on the internal Docker network. Only Caddy (80/443) is public.
- The API runs as a non-root user; env validation hard-fails on missing/insecure secrets in production.
- Rotate secrets by editing `.env.prod` and redeploying (note: changing `ENCRYPTION_KEY` makes previously-encrypted fields unreadable).
