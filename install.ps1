# ==============================================================================
# Kestrel AI - Automated Windows Quick Installer
# Usage: irm https://raw.githubusercontent.com/Maazkorejo/Kestrel/main/install.ps1 | iex
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  Kestrel AI - Cybersecurity IDE & DevSecOps Engine" -ForegroundColor Green
Write-Host "  Hunt flaws. Ship armor." -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

$RepoOwner = "Maazkorejo"
$RepoName = "Kestrel"
$ApiUrl = "https://api.github.com/repos/$RepoOwner/$RepoName/releases/latest"

try {
    Write-Host "[1/3] Querying latest Kestrel release from GitHub..." -ForegroundColor Yellow
    $Release = Invoke-RestMethod -Uri $ApiUrl -Headers @{ "User-Agent" = "Kestrel-Installer" }
    $TagName = $Release.tag_name
    Write-Host "      Found latest release: $TagName" -ForegroundColor Green

    # Find setup executable asset
    $Asset = $Release.assets | Where-Object { $_.name -like "*Setup*.exe" } | Select-Object -First 1
    if (-not $Asset) {
        $Asset = $Release.assets | Where-Object { $_.name -like "*.exe" } | Select-Object -First 1
    }

    if (-not $Asset) {
        Write-Warning "No pre-compiled installer found in release $TagName. Please visit https://github.com/$RepoOwner/$RepoName/releases"
        exit 1
    }

    $DownloadUrl = $Asset.browser_download_url
    $TempInstaller = Join-Path $env:TEMP $Asset.name

    Write-Host "[2/3] Downloading $($Asset.name)..." -ForegroundColor Yellow
    Write-Host "      Source: $DownloadUrl" -ForegroundColor Gray
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $TempInstaller -UseBasicParsing
    Write-Host "      Download complete!" -ForegroundColor Green

    Write-Host "[3/3] Launching Kestrel Installer..." -ForegroundColor Yellow
    Start-Process -FilePath $TempInstaller

    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Green
    Write-Host "  Kestrel installation wizard launched successfully!" -ForegroundColor Green
    Write-Host "  Complete the setup wizard to create your Desktop shortcut." -ForegroundColor White
    Write-Host "=================================================================" -ForegroundColor Green
}
catch {
    Write-Host "[!] Installation failed: $_" -ForegroundColor Red
    Write-Host "    You can manually download the installer from:" -ForegroundColor Yellow
    Write-Host "    https://github.com/$RepoOwner/$RepoName/releases" -ForegroundColor Cyan
    exit 1
}
