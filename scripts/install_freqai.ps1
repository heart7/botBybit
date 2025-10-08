<#
Install freqai helper script.

Usage:
  # Basic attempt (tries PyPI first)
  .\scripts\install_freqai.ps1

  # Attempt from a git repo URL (if freqai is hosted on GitHub)
  .\scripts\install_freqai.ps1 -RepoUrl 'https://github.com/OWNER/freqai.git'

  # Also install tensorflow-cpu if requested
  .\scripts\install_freqai.ps1 -InstallTF

Notes:
- This script runs pip via 'python -m pip' so it uses the active Python interpreter.
- If install fails from PyPI, provide a repository URL with -RepoUrl to try installing from source.
#>

param(
    [string]$RepoUrl = '',
    [switch]$InstallTF
)

function Run-Command($cmd) {
    Write-Host "> $cmd"
    & powershell -NoProfile -Command $cmd
    return $LASTEXITCODE
}

Write-Host "Upgrading pip, setuptools, wheel using the active Python..."
$rc = Run-Command 'python -m pip install --upgrade pip setuptools wheel'
if ($rc -ne 0) { Write-Warning "pip upgrade returned exit code $rc" }

if ($InstallTF) {
    Write-Host "Installing tensorflow-cpu (recommended for CPU-only systems)..."
    $rc = Run-Command 'python -m pip install tensorflow-cpu'
    if ($rc -ne 0) { Write-Warning "tensorflow-cpu install returned exit code $rc" }
}

Write-Host "Attempting to install 'freqai' from PyPI..."
$rc = Run-Command 'python -m pip install freqai'
if ($rc -eq 0) {
    Write-Host "freqai installed successfully from PyPI."
    exit 0
}

Write-Warning "freqai not found on PyPI or install failed."
if ($RepoUrl) {
    Write-Host "Attempting to install from repository: $RepoUrl"
    $cmd = "python -m pip install 'git+$RepoUrl'"
    $rc = Run-Command $cmd
    if ($rc -eq 0) {
        Write-Host "freqai installed successfully from $RepoUrl"
        exit 0
    }
    Write-Warning "Install from repo failed with exit code $rc"
}

Write-Host "--- Troubleshooting / next steps ---"
Write-Host "1. If freqai is hosted on GitHub, re-run this script with -RepoUrl 'https://github.com/OWNER/freqai.git' replacing OWNER and repo name."
Write-Host "2. If freqai is not public, obtain the wheel or source and install with 'python -m pip install path\to\freqai.whl'"
Write-Host "3. Ensure TensorFlow is installed (prefer CPU build for testing): 'python -m pip install tensorflow-cpu'"
Write-Host "4. If you want, paste the full pip error output here and I can analyze it and suggest fixes."

exit 1
