# Automated Oracle ARM VM retry (₹0)

Oracle's free ARM shape is often "Out of host capacity". This grabs one automatically
by retrying the launch API across all availability domains until it succeeds.

**One-time setup (~10 min), then one command that runs unattended.**

---

## 1. Install the OCI CLI (Windows PowerShell)

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
Invoke-Expression ((Invoke-WebRequest -useb https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.ps1).Content)
```
Accept the defaults. **Close and reopen PowerShell** afterwards, then verify:
```powershell
oci --version
```

## 2. Connect the CLI to your account

```powershell
oci setup config
```
It will ask for:
- **User OCID** — Oracle Console → top-right profile → **My profile** → copy **OCID**.
- **Tenancy OCID** — profile menu → **Tenancy: …** → copy **OCID**.
- **Region** — e.g. `ap-hyderabad-1` or `ap-mumbai-1` (your home region).
- **Generate a new API Signing key?** → **Y** (accept the default paths).

It prints where it saved the **public key** (e.g. `~/.oci/oci_api_key_public.pem`). Copy its contents:
```powershell
Get-Content $HOME\.oci\oci_api_key_public.pem
```
Then in the Console: profile → **My profile → API keys → Add API key → Paste public key** → paste it → **Add**.

## 3. Make sure you have a network + SSH key

- **VCN + public subnet:** if your earlier console attempt didn't create one, do
  Console → **Networking → Virtual Cloud Networks → Start VCN Wizard → "VCN with Internet Connectivity"** → Create.
- **SSH key** (used to log in to the VM, and to share with me for the deploy):
  ```powershell
  if (!(Test-Path $HOME\.ssh\id_rsa.pub)) { ssh-keygen -t rsa -b 4096 -f $HOME\.ssh\id_rsa -N '""' }
  ```

## 4. Run the retry (leave it open)

```powershell
cd C:\Users\v-hbonthada\WorkSpace-Pract\FinancialAnalyzer
powershell -ExecutionPolicy Bypass -File deploy\oci-retry.ps1
```

It tries **1 OCPU / 6 GB** (best capacity odds) every 60s across all ADs. When it wins it prints:
```
SUCCESS! Instance is launching.
  OCID: ocid1.instance....
```

Want a bigger VM? `... -File deploy\oci-retry.ps1 -OCPUs 2 -MemGB 12`
Slower/faster polling? add `-IntervalSec 90`.

## 5. Get the public IP + finish

About a minute after success:
```powershell
# replace <OCID> with the one printed above
oci compute instance list-vnics --instance-id <OCID> --query 'data[0]."public-ip"' --raw-output
```

Then either follow **INSTRUCTIONS.md** from Part 2 (DNS) onward, **or** paste me that
**public IP** and your **SSH private key** (`~/.ssh/id_rsa`) and I'll run the entire deploy for you.

---

### Tips
- Capacity frees up constantly; **early morning in your region's timezone** hits fastest.
- If it says *"Free-tier limit reached"*, you already have an A1 instance — check Console → Compute → Instances.
- Keep the window open; it's harmless to run for hours.
