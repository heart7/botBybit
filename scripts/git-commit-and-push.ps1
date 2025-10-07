param(
    [string]$Message = "Update",
    [switch]$RunTests
)

# Optionally run tests before committing
if ($RunTests) {
    Write-Output "Running tests..."
    .venv\Scripts\python.exe -m pytest -q
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Tests failed. Aborting commit."
        exit 1
    }
}

# Staging
git add -A

# Commit if there are changes
$commitOutput = git commit -m $Message 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Output "No changes to commit or commit failed. Git output:"
    Write-Output $commitOutput
} else {
    Write-Output "Committed: $Message"
    # Push
    git push origin HEAD
}
