<#
Docker precheck for Windows PowerShell

Checks:
- docker client/server version
- run hello-world container
- check WSL status
- prints guidance for common failures

Usage: ./scripts/docker_precheck.ps1
#>

Write-Host "=== Docker precheck ==="

function Run-Command($cmd) {
    try {
        $out = & powershell -NoProfile -Command $cmd 2>&1
        return @{ success = $true; output = $out }
    } catch {
        return @{ success = $false; output = $_.Exception.Message }
    }
}

Write-Host "Checking 'docker version'..."
$dv = Run-Command "docker version --format '{{.Client.Version}} {{.Server.Version}}'"
if ($dv.success) {
    Write-Host "Docker version output:`n$($dv.output)"
} else {
    Write-Host "docker version failed: $($dv.output)"
    Write-Host "- Is Docker Desktop running?"
    Write-Host "- If using WSL2 backend, ensure WSL is enabled and Docker Desktop is configured to use it."
}

Write-Host "\nRunning 'docker run --rm hello-world' to validate runtime..."
$hw = Run-Command "docker run --rm hello-world"
if ($hw.success) {
    Write-Host "hello-world output:`n$($hw.output)"
} else {
    Write-Host "hello-world run failed: $($hw.output)"
    Write-Host "- If this fails, docker daemon may not be running or you may have insufficient permissions."
}

Write-Host "\nChecking WSL status (if available)..."
$wsl = Run-Command "wsl -l -v"
if ($wsl.success) {
    Write-Host "WSL status:`n$($wsl.output)"
} else {
    Write-Host "wsl check failed: $($wsl.output)"
    Write-Host "- WSL may not be installed; install via 'wsl --install' or enable Windows features."
}

Write-Host "\nIf Docker commands above failed, try:"
Write-Host "- Start Docker Desktop and wait until it's healthy."
Write-Host "- Ensure your user has permissions to run Docker."
Write-Host "- If using WSL2, ensure a WSL distro is installed and Docker Desktop integration is enabled."
Write-Host "- Re-run this script after addressing any issues."

Write-Host "=== End precheck ==="
