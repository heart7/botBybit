param(
    [string]$Message = "Update",
    [switch]$RunTests,
    [switch]$Force,
    [string]$PythonPath = "python"
)

# Ensure venv exists when tests are requested
if ($RunTests) {
    if (-not (Test-Path -Path .venv -PathType Container)) {
        Write-Output ".venv not found. Creating virtual environment with $PythonPath..."
        & $PythonPath -m venv .venv
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to create virtual environment. Aborting."
            exit 1
        }
        .venv\Scripts\pip.exe install --upgrade pip
    }

    # Ensure dev requirements are available in the venv for running tests
    if (Test-Path -Path (Join-Path (Get-Location) 'requirements-dev.txt')) {
        Write-Output "Installing dev requirements in .venv..."
        .venv\Scripts\pip.exe install -r requirements-dev.txt | Out-Null
    } else {
        Write-Output "requirements-dev.txt not found; installing pytest alone"
        .venv\Scripts\pip.exe install --upgrade pytest | Out-Null
    }

    # Run ruff --fix if available
    if (Test-Path -Path (Join-Path (Get-Location) 'requirements-dev.txt')) {
        try {
            .venv\Scripts\ruff.exe --version > $null 2>&1
            Write-Output "Running ruff --fix..."
            .venv\Scripts\ruff.exe --fix . | Out-Null
        } catch {
            Write-Output "ruff not available in venv; skipping formatting"
        }
    }

    Write-Output "Running tests..."
    .venv\Scripts\python.exe -m pytest -q
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Tests failed."
        if ($Force) {
            Write-Output "Force flag passed; proceeding to commit despite test failures."
            $forceCommit = $true
        } else {
            $answer = Read-Host "Force commit anyway? (y/N)"
            if ($answer -notin @('y','Y')) {
                Write-Output "Aborting commit due to failing tests."
                exit 1
            }
            $forceCommit = $true
        }
    }
}

# Staging
git add -A

# Commit if there are changes (respect the force decision if provided)
if ($forceCommit) {
    $commitOutput = git commit -m $Message --no-verify 2>&1
} else {
    $commitOutput = git commit -m $Message 2>&1
}

if ($LASTEXITCODE -ne 0) {
    Write-Output "No changes to commit or commit failed. Git output:"
    Write-Output $commitOutput
} else {
    Write-Output "Committed: $Message"
    # Push
    git push origin HEAD
}
