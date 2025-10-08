<#
Ensure pip is installed for the active Python interpreter.

Usage:
  .\scripts\install_pip.ps1

This script will try, in order:
  - python -m pip --version (if already present, offer to upgrade)
  - python -m ensurepip --upgrade
  - download get-pip.py and run it
#>

Write-Host "Checking for pip..."
try {
    & python -m pip --version
    Write-Host "pip is already installed. Upgrading..."
    & python -m pip install --upgrade pip setuptools wheel
    exit 0
} catch {
    Write-Host "pip not found. Attempting ensurepip..."
}

try {
    & python -m ensurepip --upgrade
    Write-Host "ensurepip succeeded. Upgrading pip..."
    & python -m pip install --upgrade pip setuptools wheel
    exit 0
} catch {
    Write-Warning "ensurepip failed or not available. Falling back to get-pip.py"
}

$tmp = Join-Path $env:TEMP 'get-pip.py'
Write-Host "Downloading get-pip.py to $tmp"
Invoke-WebRequest -Uri https://bootstrap.pypa.io/get-pip.py -OutFile $tmp
if (Test-Path $tmp) {
    Write-Host "Running get-pip.py..."
    & python $tmp
    if ($LASTEXITCODE -eq 0) {
        Write-Host "pip installed successfully. Upgrading packaging tools..."
        & python -m pip install --upgrade pip setuptools wheel
        exit 0
    } else {
        Write-Error "get-pip.py failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
} else {
    Write-Error "Failed to download get-pip.py"
    exit 1
}
