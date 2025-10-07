<#
Setup development environment (PowerShell)
Creates .venv if missing, installs dev requirements, and runs pre-commit install.
#>
param(
    [string]$PythonPath = "python"
)

if (-not (Test-Path -Path .venv -PathType Container)) {
    Write-Output ".venv not found. Creating virtual environment with $PythonPath..."
    & $PythonPath -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create virtual environment."
        exit 1
    }
}

.venv\Scripts\pip.exe install --upgrade pip
if (Test-Path -Path requirements-dev.txt) {
    Write-Output "Installing dev requirements..."
    .venv\Scripts\pip.exe install -r requirements-dev.txt
} else {
    Write-Output "requirements-dev.txt not found; installing pytest and pre-commit"
    .venv\Scripts\pip.exe install -U pytest pre-commit
}

Write-Output "Installing pre-commit hooks..."
try {
    .venv\Scripts\pre-commit.exe install
    Write-Output "pre-commit installed successfully."
} catch {
    Write-Warning "pre-commit not available in venv; try installing it manually or rerun the script."
}

Write-Output "Development setup complete."
