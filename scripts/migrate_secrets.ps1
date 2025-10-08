<#
Migrate secrets from config.json into a local .env file and remove them from config.json.

Usage:
  .\scripts\migrate_secrets.ps1

What it does:
  - Reads config.json
  - Extracts exchange.key, exchange.secret, notifier.telegram.token, notifier.telegram.chat_id
  - Writes or appends those values into .env (in repo root)
  - Backs up config.json to config.json.bak.<timestamp>
  - Removes the secrets from config.json and writes the sanitized file back
  - Prints the resulting .env content to stdout so you can save it securely elsewhere

Note: This script edits files in-place. Commit or examine the backup before pushing.
#>

param()

function Get-Timestamp { return (Get-Date).ToString('yyyyMMddTHHmmss') }

$repoRoot = Get-Location
$configPath = Join-Path $repoRoot 'config.json'
$envPath = Join-Path $repoRoot '.env'

if (-not (Test-Path $configPath)) {
    Write-Error "config.json not found at $configPath"
    exit 1
}

$json = Get-Content $configPath -Raw | ConvertFrom-Json

$pairs = @{}

if ($json.exchange -and $json.exchange.key) { $pairs['EXCHANGE_KEY'] = $json.exchange.key }
if ($json.exchange -and $json.exchange.secret) { $pairs['EXCHANGE_SECRET'] = $json.exchange.secret }

if ($json.notifier -and $json.notifier.telegram) {
    if ($json.notifier.telegram.token) { $pairs['TELEGRAM_TOKEN'] = $json.notifier.telegram.token }
    if ($json.notifier.telegram.chat_id) { $pairs['TELEGRAM_CHAT_ID'] = $json.notifier.telegram.chat_id }
}

if ($pairs.Count -eq 0) {
    Write-Host "No secrets detected in config.json. Nothing to migrate."
    exit 0
}

# Backup config
$bak = Join-Path $repoRoot ("config.json.bak.{0}" -f (Get-Timestamp))
Copy-Item $configPath $bak -Force
Write-Host "Backed up config.json -> $bak"

# Write or append .env
if (-not (Test-Path $envPath)) {
    Write-Host "Creating .env"
    '' | Out-File -FilePath $envPath -Encoding utf8
}

foreach ($k in $pairs.Keys) {
    $v = $pairs[$k]
    # Remove existing entries
    (Get-Content $envPath) | Where-Object { $_ -notmatch "^\s*$k\s*=" } | Set-Content $envPath
    # Append new value
    "${k}=$v" | Add-Content $envPath
}

Write-Host "Wrote values to $envPath"

# Remove secrets from config object
if ($json.exchange) {
    $json.exchange.PSObject.Properties.Remove('key') | Out-Null
    $json.exchange.PSObject.Properties.Remove('secret') | Out-Null
}
if ($json.notifier -and $json.notifier.telegram) {
    $json.notifier.telegram.PSObject.Properties.Remove('token') | Out-Null
    $json.notifier.telegram.PSObject.Properties.Remove('chat_id') | Out-Null
}

# Write sanitized config back
$json | ConvertTo-Json -Depth 10 | Out-File -FilePath $configPath -Encoding utf8
Write-Host "Sanitized config.json written (secrets removed). Backup is at $bak"

# Print .env contents for secure saving
Write-Host "\n--- .env contents (copy & save securely) ---\n"
Get-Content $envPath | ForEach-Object { Write-Host $_ }
Write-Host "\n--- end .env ---\n"

Write-Host "Migration complete. Review $envPath and the backup $bak before committing any changes."
