# 🚀 Deploy FinancialAnalyzer to fin.circuvent.com — Step-by-Step

This is your complete, copy‑paste guide. Follow it top to bottom.

- **Cost:** ₹0/month (Oracle Cloud Always‑Free)
- **Time:** ~30–45 min (most of it is Oracle sign‑up + one 5‑min build)
- **You need:** the GoDaddy login for `circuvent.com`, a phone + a card for Oracle sign‑up (Always‑Free is **not** charged), and your GitHub login.

> Prefer not to touch a terminal? Skip to **[Option B: let Copilot finish it](#option-b--let-copilot-finish-it-for-you)** at the bottom.

---

## ✅ Checklist (tick as you go)

- [ ] 1. Create Oracle Cloud account
- [ ] 2. Create the free Ubuntu ARM server (VM)
- [ ] 3. Open ports 80 + 443 in Oracle
- [ ] 4. Point `fin.circuvent.com` at the server (GoDaddy DNS)
- [ ] 5. Connect to the server (SSH)
- [ ] 6. Run the one‑command deploy
- [ ] 7. Make yourself admin
- [ ] 8. Open the live site ✅

---

## Part 1 — Create the server (Oracle Cloud, free)

1. Go to <https://www.oracle.com/cloud/free/> → **Start for free**. Sign up.
   - When asked for **Home Region**, pick one near you: **India South (Hyderabad)**, **India West (Mumbai)**, or **Singapore**. ⚠️ You cannot change this later.
   - A card is required for verification. Always‑Free resources are **not billed**.

2. In the Oracle console: top‑left **☰ menu → Compute → Instances → Create instance**.
   - **Name:** `fin`
   - **Image and shape → Edit:**
     - **Image:** Canonical **Ubuntu 22.04**
     - **Shape:** click **Ampere** (Arm) → **VM.Standard.A1.Flex** → set **2 OCPUs** and **12 GB** memory (free‑tier eligible).
   - **Networking:** leave "Create new virtual cloud network", and keep **Assign a public IPv4 address = Yes**.
   - **Add SSH keys:** choose **Generate a key pair for me** → click **Save private key** (download it — e.g. to `Downloads\ssh-key-fin.key`). Also save the public key.
   - Click **Create**. Wait until state = **Running**.
   - **📋 Copy the "Public IP address"** shown on the instance page. You'll use it twice below.

3. **Open the firewall (ports 80 & 443):**
   - **☰ menu → Networking → Virtual Cloud Networks →** click your VCN → **Security Lists →** click **Default Security List**.
   - **Add Ingress Rules** → add these two (leave other fields default):
     | Source CIDR | IP Protocol | Destination Port |
     |-------------|-------------|------------------|
     | `0.0.0.0/0` | TCP | `80` |
     | `0.0.0.0/0` | TCP | `443` |
   - Save. (Port 22 for SSH is already open.)

---

## Part 2 — Point the subdomain at the server (GoDaddy)

1. Sign in at <https://godaddy.com> → **My Products** → next to **circuvent.com** click **DNS** (Manage DNS).
2. Under **Records** → **Add** →
   - **Type:** `A`
   - **Name:** `fin`
   - **Value:** *your VM's Public IP* (from Part 1)
   - **TTL:** 600 seconds (or 1 hour)
3. **Add a second record the same way**, for the staging site:
   - **Type:** `A`
   - **Name:** `dev`
   - **Value:** *the same VM Public IP*
   - **TTL:** 600 seconds
4. **Save.**
5. (Optional) Check it from your Windows PowerShell after a few minutes:
   ```powershell
   nslookup fin.circuvent.com
   nslookup dev.circuvent.com
   ```
   Both should show your VM's IP.

---

## Part 3 — Connect to the server (SSH from Windows)

Open **PowerShell** on your laptop. Use the private key you downloaded:

```powershell
ssh -i "C:\Users\v-hbonthada\Downloads\ssh-key-fin.key" ubuntu@YOUR_PUBLIC_IP
```

- Replace `YOUR_PUBLIC_IP` with the VM IP. The username is `ubuntu`.
- Type `yes` if asked to trust the host.
- **If you get a "permissions are too open / bad permissions" error**, lock the key file down, then retry the ssh command:
  ```powershell
  icacls "C:\Users\v-hbonthada\Downloads\ssh-key-fin.key" /inheritance:r
  icacls "C:\Users\v-hbonthada\Downloads\ssh-key-fin.key" /grant:r "$($env:USERNAME):R"
  ```

You're now on the server (prompt looks like `ubuntu@fin:~$`).

---

## Part 4 — Get the code and deploy (one command)

The repo is private, so pick **one** way to download it:

**Option A (simplest): make the repo public for the download**
On GitHub → your repo **Settings → General → Danger Zone → Change visibility → Public**. Then on the server:
```bash
git clone https://github.com/Hemakotibonthada/financialanalyzer.git
```
(You can switch it back to Private afterwards.)

**Option B (keep it private): use a token**
Create a token at GitHub → **Settings → Developer settings → Personal access tokens → Fine‑grained tokens → Generate**. Give it **Contents: Read‑only** for the `financialanalyzer` repo, generate, and copy it. Then on the server (paste your token where shown):
```bash
git clone https://x-access-token:YOUR_TOKEN@github.com/Hemakotibonthada/financialanalyzer.git
```

Now deploy:
```bash
cd financialanalyzer
git checkout main
sudo ACME_EMAIL=hemakotibonthada@gmail.com bash deploy/deploy.sh fin
```

This automatically installs Docker, opens the host firewall, generates strong secrets, builds everything, and gets a free HTTPS certificate. **The first build takes ~5–8 minutes.**

Then bring up the staging site the same way (it reuses the certificate machinery, so it is quicker):
```bash
git checkout dev
sudo bash deploy/deploy.sh dev
```

You now have two independent sites on the one server:

| URL | Branch | Purpose |
|---|---|---|
| https://fin.circuvent.com | `main` | Live site |
| https://dev.circuvent.com | `dev` | Testing — separate database, safe to break |

After this first manual run, **pushes deploy themselves** via GitHub Actions: push to
`main` updates `fin`, push to `dev` updates `dev`. See `deploy/README.md` for the four
repository secrets that enables.

When it finishes it prints the URLs. Give HTTPS ~30–60 seconds on the very first visit while the certificate is issued.

---

## Part 5 — Make yourself the admin

1. Open **https://fin.circuvent.com/register** and create your account (use `hemakotibonthada@gmail.com`).
2. Back in the SSH terminal (still inside the `financialanalyzer` folder), run:
   ```bash
   docker compose -p finanalyzer-fin --env-file .env.fin -f docker-compose.prod.yml exec mongo \
     mongosh -u root -p "$(grep MONGO_ROOT_PASSWORD .env.fin | cut -d= -f2)" \
     --authenticationDatabase admin financial_analyzer \
     --eval 'db.users.updateOne({email:"hemakotibonthada@gmail.com"},{$set:{role:"admin"}})'
   ```
   Admins get every feature unlocked — no subscription needed for you.

---

## Part 6 — You're live 🎉

Open **https://fin.circuvent.com** and log in.

---

## Part 7 — (Optional, later) Turn on emails & real payments

Edit the secrets file on the server, fill what you want, then re‑run the deploy to apply:
```bash
nano .env.fin        # edit values, Ctrl+O to save, Ctrl+X to exit
sudo bash deploy/deploy.sh
```
- **Real verification/alert emails:** set `EMAIL_HOST=smtp.gmail.com`, `EMAIL_PORT=587`, `EMAIL_USER=hemakotibonthada@gmail.com`, `EMAIL_PASSWORD=`*(a Gmail **App Password**, not your login password)*, `EMAIL_FROM=hemakotibonthada@gmail.com`.
  (Create an App Password at <https://myaccount.google.com/apppasswords> — needs 2‑Step Verification on.)
- **Real subscriptions (money):** set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` from your Razorpay dashboard, then add a webhook there pointing to `https://fin.circuvent.com/api/billing/webhook`.
- **Error tracking:** set `SENTRY_DSN`.

Without these, the app still runs fully — emails just get logged and billing runs in test mode.

---

## 🔧 Troubleshooting

| Problem | Fix |
|--------|-----|
| Oracle says **"Out of host capacity"** for ARM | Try a different Availability Domain, or retry in a few hours (common on free tier). If stuck, tell me — I'll give a fallback. |
| Site won't load | 1) `nslookup fin.circuvent.com` returns your IP? 2) Oracle ingress rules for 80/443 added? 3) Wait 60s for the certificate. |
| Certificate warning for a minute | Normal on first hit — Caddy is fetching the Let's Encrypt cert. Refresh after ~60s. |
| See what's happening | `docker compose -p finanalyzer-fin --env-file .env.fin -f docker-compose.prod.yml logs -f caddy` (Ctrl+C to exit) |
| Check all services are up | `docker compose -p finanalyzer-fin --env-file .env.fin -f docker-compose.prod.yml ps` |

---

## 🔁 Day‑2: update the app later

After I push new code, on the server:
```bash
cd financialanalyzer
git pull
sudo bash deploy/deploy.sh
```

Back up the database anytime:
```bash
docker compose -p finanalyzer-fin --env-file .env.fin -f docker-compose.prod.yml exec mongo \
  sh -c 'mongodump -u root -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive' \
  > backup-$(date +%F).archive
```

---

## Option B — let Copilot finish it for you

If you'd rather not run the terminal parts:
1. Do **Part 1, Part 2, Part 3‑key** yourself (create the VM, add the DNS record, download the SSH key).
2. Send me: the **public IP** and the **SSH private key** file contents.
3. I'll SSH in, run the deploy, make you admin, and confirm the live site — you do nothing else.

⚠️ Only share the key if you're comfortable; you can delete/rotate that key pair in Oracle afterwards.

---

**Questions or something errored?** Paste the exact message to me and I'll fix it.
