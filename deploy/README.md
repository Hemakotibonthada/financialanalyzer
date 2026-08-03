# Deploying FinancialAnalyzer

Two environments run on one VM behind a single Caddy edge proxy:

| Environment | URL | Branch | Deployed by |
|---|---|---|---|
| Production | https://fin.circuvent.com | `main` | GitHub Actions (`.github/workflows/deploy.yml`) |
| Staging | https://dev.circuvent.com | `dev` | GitHub Actions |

Caddy owns `:80`/`:443` and routes by hostname. Each environment is otherwise
completely isolated: its own containers, MongoDB, Redis, volumes and secrets.
Deploying one never touches the other, and staging cannot read production data.

```
                    ┌──────────────────────────┐
   :80/:443  ───────▶  Caddy (circuvent-edge)  │
                    └───────────┬──────────────┘
                                │  circuvent_edge network
                 ┌──────────────┴───────────────┐
                 ▼                              ▼
       fin-web / fin-api               dev-web / dev-api
       + mongo + redis                 + mongo + redis
       (project finanalyzer-fin)       (project finanalyzer-dev)
```

---

## What you need to do once

| Task | Who |
|---|---|
| Create the VM (Oracle Cloud Always-Free ARM works) | **You** |
| Allow ingress TCP 80 + 443 in the Oracle Security List / VCN | **You** |
| Point DNS `fin` **and** `dev` → server IP | **You** (or `godaddy-dns.sh`) |
| Install Docker, firewall, TLS, build, run | `deploy.sh` |

### 1. DNS

Both subdomains must resolve to the same server IP.

In `circuvent.com → DNS → Records → Add`:
- Type **A**, Name **fin**, Value **<server public IP>**, TTL 600
- Type **A**, Name **dev**, Value **<server public IP>**, TTL 600

Or via the API helper:

```bash
GODADDY_KEY=xxx GODADDY_SECRET=yyy bash deploy/godaddy-dns.sh circuvent.com fin
GODADDY_KEY=xxx GODADDY_SECRET=yyy bash deploy/godaddy-dns.sh circuvent.com dev
```

Verify: `dig +short fin.circuvent.com` and `dig +short dev.circuvent.com` should
both return your IP.

### 2. First deploy

SSH to the server, clone the repo, then:

```bash
# Production (also starts the shared edge proxy on first run)
sudo ACME_EMAIL=you@example.com bash deploy/deploy.sh fin

# Staging
sudo ACME_EMAIL=you@example.com bash deploy/deploy.sh dev
```

`ACME_EMAIL` is only needed the first time — it is stored in `.env.edge`.

First build takes ~5–8 min per environment. The first HTTPS request may take
another 30–60s while Caddy obtains a Let's Encrypt certificate.

---

## Continuous delivery

After the first manual deploy, pushes deploy themselves:

- push to `main` → https://fin.circuvent.com
- push to `dev` → https://dev.circuvent.com

The workflow re-runs backend tests and the frontend build **before** deploying,
then polls `/api/health` for up to 5 minutes and fails the run if the site does
not come back.

### Required repository secrets

`Settings → Secrets and variables → Actions`:

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | server public IP or hostname |
| `DEPLOY_USER` | SSH user, e.g. `ubuntu` |
| `DEPLOY_SSH_KEY` | private key for that user (the whole PEM, including header/footer lines) |
| `ACME_EMAIL` | e-mail for Let's Encrypt |

Optional: `DEPLOY_PORT` (defaults to 22), `DEPLOY_PATH` (defaults to
`~/FinancialAnalyzer`).

You can also deploy manually from the Actions tab via **Run workflow** and pick
the environment.

---

## Day-to-day

```bash
# Redeploy after a git pull
sudo bash deploy/deploy.sh fin

# Logs
docker logs -f circuvent-edge                                   # proxy / TLS
docker compose -p finanalyzer-fin --env-file .env.fin \
  -f docker-compose.prod.yml logs -f api                        # production API
docker compose -p finanalyzer-dev --env-file .env.dev \
  -f docker-compose.prod.yml logs -f api                        # staging API

# Status
docker compose -p finanalyzer-fin --env-file .env.fin -f docker-compose.prod.yml ps
```

### Promoting a user to admin

Register normally at `https://fin.circuvent.com/register`, then:

```bash
docker compose -p finanalyzer-fin --env-file .env.fin -f docker-compose.prod.yml \
  exec mongo mongosh -u root -p "$(grep MONGO_ROOT_PASSWORD .env.fin | cut -d= -f2)" \
  --authenticationDatabase admin financial_analyzer \
  --eval 'db.users.updateOne({email:"you@example.com"},{$set:{role:"admin"}})'
```

---

## Notes

- **Secrets are per-environment.** `.env.fin` and `.env.dev` hold different JWT,
  encryption, session and Mongo credentials, so a leaked staging key grants
  nothing in production. Both are gitignored and generated once, then preserved
  across redeploys.
- **Certificates survive redeploys.** Caddy's data lives in the external volume
  `circuvent_caddy_data`, outside the app stacks, so tearing an environment down
  does not discard certificates or risk Let's Encrypt rate limits.
- **Staging is not indexed.** Caddy sends `X-Robots-Tag: noindex, nofollow` and
  serves a disallow-all `robots.txt` on `dev.circuvent.com`, so it never
  competes with production in search results.
- **Real subscriptions:** set `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET` (live keys)
  in `.env.fin` and redeploy. Leave blank in staging so it stays in dev mode.

## If it does not load

1. `dig +short fin.circuvent.com` returns your server IP?
2. Oracle Security List / VCN allows ingress TCP 80 and 443?
3. `docker logs circuvent-edge` — certificate errors show here.
4. `docker network inspect circuvent_edge` — both environments attached?