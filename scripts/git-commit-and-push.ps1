param(
    [string]$Message = "Update",
    [switch]$RunTests
)

# Ensure venv exists when tests are requested
if ($RunTests) {
    if (-not (Test-Path -Path .venv -PathType Container)) {
        Write-Output ".venv not found. Creating virtual environment..."
        python -m venv .venv
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to create virtual environment. Aborting."
            exit 1
        }
        .venv\Scripts\pip.exe install --upgrade pip
    }

    # Ensure pytest is available in the venv for running tests
    Write-Output "Installing/ensuring pytest in .venv..."
    .venv\Scripts\pip.exe install --upgrade pytest | Out-Null

    Write-Output "Running tests..."
    .venv\Scripts\python.exe -m pytest -q
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Tests failed."
        $answer = Read-Host "Force commit anyway? (y/N)"
        if ($answer -notin @('y','Y')) {
            Write-Output "Aborting commit due to failing tests."
            exit 1
        }
        $forceCommit = $true
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
