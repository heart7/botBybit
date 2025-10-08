<#
Helper: download extended history with freqtrade (PowerShell)

Usage:
  ./scripts/download_history.ps1 -pair "BTC/USDT" -exchange "bybit" -timeframe "1h" -start "2023-01-01"

#>
param(
    [string]$pair = "BTC/USDT",
    [string]$exchange = "bybit",
    [string]$timeframe = "1h",
    [string]$start = "2023-01-01"
)

$cmd = "freqtrade download-data --exchange $exchange --pairs $pair --timeframes $timeframe --since $start"
Write-Host "Running: $cmd"
& powershell -Command $cmd
