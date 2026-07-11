<#
  oci-retry.ps1  —  Keep asking Oracle Cloud for a free ARM VM until capacity appears.

  Oracle's Always-Free Ampere (A1) shape is frequently "Out of host capacity".
  This script retries the launch across every availability domain on an interval
  until it succeeds, then prints the instance OCID + how to get its public IP.

  PREREQUISITES (one-time, see deploy/ORACLE-RETRY.md):
    1. Install OCI CLI.
    2. Run `oci setup config` and upload the API public key in the Console.
    3. Create a VCN + public subnet (Console -> Networking -> VCN wizard) if you
       haven't already (the failed console attempt usually creates one).
    4. Have an SSH public key (default: ~/.ssh/id_rsa.pub).

  USAGE:
    powershell -ExecutionPolicy Bypass -File deploy\oci-retry.ps1
    # or with options:
    powershell -File deploy\oci-retry.ps1 -OCPUs 2 -MemGB 12 -IntervalSec 90
#>

param(
  [string]$DisplayName = "finserve",
  [int]$OCPUs = 1,                 # 1 OCPU / 6 GB has the best capacity odds. Bump to 2/12 or 4/24 later.
  [int]$MemGB = 6,
  [int]$BootGB = 50,
  [string]$SshPublicKeyPath = "$HOME\.ssh\id_rsa.pub",
  [int]$IntervalSec = 60,
  [string]$CompartmentId = ""      # defaults to your tenancy (root compartment)
)

$ErrorActionPreference = "Stop"

function Fail($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

if (-not (Get-Command oci -ErrorAction SilentlyContinue)) {
  Fail "OCI CLI not found. Install it first (see deploy/ORACLE-RETRY.md)."
}
if (-not (Test-Path $SshPublicKeyPath)) {
  Fail "SSH public key not found at $SshPublicKeyPath. Generate one: ssh-keygen -t rsa -b 4096 -f `$HOME\.ssh\id_rsa"
}

# --- Resolve tenancy (root compartment) from ~/.oci/config if not supplied ---
if (-not $CompartmentId) {
  $cfgPath = "$HOME\.oci\config"
  if (-not (Test-Path $cfgPath)) { Fail "OCI config not found ($cfgPath). Run: oci setup config" }
  $line = Get-Content $cfgPath | Select-String '^tenancy\s*='
  if (-not $line) { Fail "Could not read tenancy from $cfgPath." }
  $CompartmentId = ($line.Line -split '=', 2)[1].Trim()
}
Write-Host "Compartment (tenancy): $CompartmentId"

# --- Discover availability domains ---
$ads = (oci iam availability-domain list --compartment-id $CompartmentId | ConvertFrom-Json).data.name
if (-not $ads) { Fail "No availability domains found. Check your OCI config/region." }
Write-Host ("Availability domains: " + ($ads -join ", "))

# --- Discover subnet (first one in the compartment) ---
$subnets = (oci network subnet list --compartment-id $CompartmentId --all | ConvertFrom-Json).data
if (-not $subnets) { Fail "No subnet found. Create a VCN + public subnet (Console -> Networking -> Start VCN Wizard)." }
$subnetId = $subnets[0].id
Write-Host "Subnet: $($subnets[0].'display-name')  ($subnetId)"

# --- Discover latest Ubuntu 22.04 image for the A1 shape ---
$imageId = (oci compute image list --compartment-id $CompartmentId `
  --operating-system "Canonical Ubuntu" --operating-system-version "22.04" `
  --shape "VM.Standard.A1.Flex" --sort-by TIMECREATED --sort-order DESC `
  | ConvertFrom-Json).data[0].id
if (-not $imageId) { Fail "Could not find an Ubuntu 22.04 image for VM.Standard.A1.Flex." }
Write-Host "Image: $imageId"

# --- Build JSON arg files (avoids Windows quoting issues) ---
$pubKey = (Get-Content $SshPublicKeyPath -Raw).Trim()
$scPath = Join-Path $env:TEMP "oci-shape.json"
$mdPath = Join-Path $env:TEMP "oci-meta.json"
@{ ocpus = $OCPUs; memoryInGBs = $MemGB } | ConvertTo-Json -Compress | Set-Content -Encoding ascii $scPath
@{ ssh_authorized_keys = $pubKey }        | ConvertTo-Json -Compress | Set-Content -Encoding ascii $mdPath
$scArg = "file://" + ($scPath -replace '\\', '/')
$mdArg = "file://" + ($mdPath -replace '\\', '/')

Write-Host ""
Write-Host "Launching $DisplayName ($OCPUs OCPU / $MemGB GB, ${BootGB}GB boot). Retrying every ${IntervalSec}s across all ADs..." -ForegroundColor Cyan
Write-Host "Leave this window open. Ctrl+C to stop." -ForegroundColor Cyan
Write-Host ""

$attempt = 0
while ($true) {
  $attempt++
  foreach ($ad in $ads) {
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] attempt #$attempt  ->  $ad"
    $out = oci compute instance launch `
      --availability-domain $ad `
      --compartment-id $CompartmentId `
      --shape "VM.Standard.A1.Flex" `
      --shape-config $scArg `
      --image-id $imageId `
      --subnet-id $subnetId `
      --display-name $DisplayName `
      --assign-public-ip true `
      --metadata $mdArg `
      --boot-volume-size-in-gbs $BootGB 2>&1 | Out-String

    if ($LASTEXITCODE -eq 0) {
      $id = ($out | ConvertFrom-Json).data.id
      Write-Host ""
      Write-Host "SUCCESS! Instance is launching." -ForegroundColor Green
      Write-Host "  OCID: $id"
      Write-Host "  Get its public IP in ~60s with:" -ForegroundColor Green
      Write-Host "    oci compute instance list-vnics --instance-id $id --query 'data[0].\"public-ip\"' --raw-output"
      exit 0
    }
    elseif ($out -match "Out of (host )?capacity") {
      Write-Host "        no capacity yet" -ForegroundColor DarkYellow
    }
    elseif ($out -match "LimitExceeded|QuotaExceeded|reached the maximum") {
      Write-Host ""
      Write-Host "Free-tier limit reached — you may already have an A1 instance." -ForegroundColor Red
      Write-Host $out
      exit 1
    }
    else {
      Write-Host "        unexpected response (will keep retrying):" -ForegroundColor DarkYellow
      Write-Host ($out.Trim())
    }
  }
  Start-Sleep -Seconds $IntervalSec
}
