<#
Run the freqtrade backtest inside Docker using the project's Dockerfile.

This mounts the repo into the container and writes backtest logs to the host.

Usage:
  ./scripts/run_backtest_docker.ps1 -timerange "2022-01-01--2025-10-01"
#>
param(
    [string]$timerange = "2022-01-01--2025-10-01",
    [string]$strategy = "MLGridStrategy",
    [string]$image = "autoflow_bot:latest",
    [string]$outfile = "user_data/backtest_debug.log"
)

Write-Host "Building Docker image (if needed)..."
docker build -t $image .

Write-Host "Running backtest inside Docker, writing logs to $outfile"
# Load .env if present to capture EXCHANGE_KEY/EXCHANGE_SECRET for docker run
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

$key = $env:EXCHANGE_KEY
$secret = $env:EXCHANGE_SECRET
if (-not $key -or -not $secret) {
  Write-Warning "EXCHANGE_KEY/EXCHANGE_SECRET not found in environment. Create a .env with these values to pass them into the container. Backtest will still run if config.json contains credentials or in dry-run mode."
}

# Build docker - pass keys as env if present
# Generate a runtime config on the host if python is available
$runtime = Join-Path -Path (Get-Location) -ChildPath 'config.runtime.json'
if (Get-Command python -ErrorAction SilentlyContinue) {
  Write-Host "Generating runtime config at $runtime"
  & python config_loader.py --out $runtime --src "config.json"
  if (Test-Path $runtime) {
    Write-Host "Runtime config created: $runtime"
  } else {
    Write-Warning "Runtime config failed to create; docker will use config.json from repository"
  }
} else {
  Write-Warning "Python not found in PATH; skipping runtime config generation. Docker will use config.json from repository"
}

$envFlags = @()
if ($key) { $envFlags += "-e EXCHANGE_KEY=$key" }
if ($secret) { $envFlags += "-e EXCHANGE_SECRET=$secret" }

# Mount the runtime config if it exists
$mounts = "-v ${PWD}:/app"
if (Test-Path $runtime) { $configArg = '--config config.runtime.json' } else { $configArg = '--config config.json' }

docker run --rm $envFlags -v ${PWD}:/app -w /app $image powershell -Command "freqtrade backtesting $configArg --strategy $strategy --timerange $timerange 2>&1 | Tee-Object -FilePath $outfile"
