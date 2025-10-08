<#
Run a freqtrade backtest with a wider timerange and capture logs.

Usage:
  ./scripts/run_backtest.ps1 -strategy "MLGridStrategy" -timerange "2023-01-01--2025-10-01"

#>
param(
    [string]$strategy = "MLGridStrategy",
    [string]$timerange = "2023-01-01--2025-10-01",
    [string]$config = "config.json",
    [string]$outfile = "user_data/backtest_debug.log"
)

Write-Host "Running backtest for strategy $strategy with timerange $timerange"

$cmd = "freqtrade backtesting --config $config --strategy $strategy --timerange $timerange"
Write-Host "Command: $cmd"

# Load environment variables from .env if present (simple loader)
$envFile = Join-Path -Path (Get-Location) -ChildPath ".env"
if (Test-Path $envFile) {
  Write-Host "Loading environment variables from $envFile"
  Get-Content $envFile | ForEach-Object {
    if ($_ -and ($_ -notmatch '^\s*#')) {
      $parts = $_ -split '=', 2
      if ($parts.Length -eq 2) {
        $name = $parts[0].Trim()
        $value = $parts[1].Trim("' \"")
        if ($name) { Set-Item -Path env:$name -Value $value }
      }
    }
  }
}

# Check for Bybit keys in environment
$key = $env:EXCHANGE_KEY
$secret = $env:EXCHANGE_SECRET
if (-not $key -or -not $secret) {
  Write-Warning "Bybit API key/secret not found in environment. Ensure you have a .env file with EXCHANGE_KEY and EXCHANGE_SECRET or set them in your shell. Backtest will still run in dry-run mode if configured."
} else {
  Write-Host "Using EXCHANGE_KEY from environment (not stored in config.json)"
}

# Generate runtime config merged with environment variables if python is available
$runtime = Join-Path -Path (Get-Location) -ChildPath 'config.runtime.json'
if (Get-Command python -ErrorAction SilentlyContinue) {
  Write-Host "Generating runtime config at $runtime"
  & python config_loader.py --out $runtime --src $config
  if (Test-Path $runtime) {
    Write-Host "Using runtime config: $runtime"
    $cmd = "freqtrade backtesting --config $runtime --strategy $strategy --timerange $timerange"
  } else {
    Write-Warning "Runtime config was not created; falling back to $config"
  }
} else {
  Write-Warning "Python not found in PATH; skipping runtime config generation. Using $config"
}

# Run and tee output to file
& powershell -Command "$cmd 2>&1 | Tee-Object -FilePath $outfile"
Write-Host "Backtest complete. Logs written to $outfile"
