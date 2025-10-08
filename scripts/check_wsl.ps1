<#
Check if WSL is installed, its version, list distros, print Windows build and virtualization status, and give guidance.

Usage:
  .\scripts\check_wsl.ps1
#>

Write-Host "Checking Windows build..."
$osver = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion').ReleaseId
$build = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion').CurrentBuild
Write-Host "Windows ReleaseId: $osver, Build: $build"

Write-Host "\nChecking if wsl.exe is available..."
if (Get-Command wsl -ErrorAction SilentlyContinue) {
    Write-Host "wsl.exe found."
    Write-Host "\nWSL status:"
    wsl --status
    Write-Host "\nListing installed distros:"
    wsl -l -v
    Write-Host "\nChecking default WSL version:"
    try { wsl --set-default-version 2 } catch { Write-Host "(set-default-version not supported or already set)" }
} else {
    Write-Warning "wsl.exe not found. WSL is not installed. Run 'wsl --install' in an elevated PowerShell to install."
}

Write-Host "\nChecking virtualization status..."
$virt = (systeminfo | Select-String 'Virtualization')
if ($virt) { $virt | ForEach-Object { Write-Host $_ } } else { Write-Host "Could not determine virtualization status." }

Write-Host "\nIf no distros are listed, install one with 'wsl --install -d Ubuntu' or from the Microsoft Store."
Write-Host "If VERSION column is 1, convert with 'wsl --set-version <DistroName> 2' using the exact name from 'wsl -l -v'."
Write-Host "If wsl.exe is missing, update Windows and install WSL from the Microsoft Store."