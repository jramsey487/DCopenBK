# DCopenBK deployment script
# Run from PowerShell with:
# .\deploy.ps1

$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------

$ProjectRoot = "C:\Users\Public\Documents\DCopenBK"
$FrontendDir = Join-Path $ProjectRoot "frontend"
$BuildDir = Join-Path $FrontendDir "build"
$BuildRootDir = Join-Path $BuildDir "root"
$PinnedNpmVersion = "10.8.2"

# ------------------------------------------------------------
# Start
# ------------------------------------------------------------

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       DCopenBK Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $ProjectRoot

# ------------------------------------------------------------
# Verify required commands and files
# ------------------------------------------------------------

Write-Host "Checking required commands and files..." -ForegroundColor Cyan

foreach ($CommandName in @("node", "npm", "npx", "fly")) {
    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: $CommandName was not found." -ForegroundColor Red
        exit 1
    }
}

$PackageJson = Join-Path $FrontendDir "package.json"
$PackageLock = Join-Path $FrontendDir "package-lock.json"

if (-not (Test-Path $PackageJson)) {
    Write-Host "ERROR: frontend/package.json was not found." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $PackageLock)) {
    Write-Host "ERROR: frontend/package-lock.json was not found." -ForegroundColor Red
    exit 1
}

Write-Host "node, npm, npx, and fly found." -ForegroundColor Green
Write-Host "Using npm $PinnedNpmVersion for the frontend install and build." -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------
# Build frontend
# ------------------------------------------------------------

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       Building Frontend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $FrontendDir

Write-Host "Installing dependencies from package-lock.json with npm $PinnedNpmVersion..." -ForegroundColor Yellow
Write-Host "This uses 'npm ci', which does not rewrite package-lock.json." -ForegroundColor DarkGray

npx --yes "npm@$PinnedNpmVersion" ci

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: npm $PinnedNpmVersion ci failed." -ForegroundColor Red
    Write-Host "Deployment stopped. The existing lockfile was not intentionally regenerated." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Building production frontend with npm $PinnedNpmVersion..." -ForegroundColor Yellow

npx --yes "npm@$PinnedNpmVersion" run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: frontend production build failed." -ForegroundColor Red
    Write-Host "Deployment stopped." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Frontend build completed successfully." -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------
# Organize build files
# ------------------------------------------------------------

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       Organizing Frontend Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $BuildDir)) {
    Write-Host "ERROR: Frontend build directory was not created:" -ForegroundColor Red
    Write-Host $BuildDir -ForegroundColor Red
    exit 1
}

# Create build/root if it doesn't exist.
New-Item -ItemType Directory -Force -Path $BuildRootDir | Out-Null

# Move everything except index.html, static, and root into build/root.
# This preserves the behavior of the previous deployment script.

Get-ChildItem $BuildDir -Force |
    Where-Object {
        $_.Name -notin @(
            "index.html",
            "static",
            "root"
        )
    } |
    ForEach-Object {
        Write-Host "Moving $($_.Name) -> build/root/" -ForegroundColor DarkGray
        Move-Item $_.FullName $BuildRootDir -Force
    }

Write-Host ""
Write-Host "Frontend files organized successfully." -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------
# Return to project root
# ------------------------------------------------------------

Set-Location $ProjectRoot

# ------------------------------------------------------------
# Deploy to Fly.io
# ------------------------------------------------------------

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       Deploying to Fly.io" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Running fly deploy..." -ForegroundColor Yellow
Write-Host ""

fly deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "       DEPLOYMENT FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# ------------------------------------------------------------
# Finished
# ------------------------------------------------------------

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "       DEPLOYMENT SUCCESSFUL" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "DCopenBK has been deployed to Fly.io." -ForegroundColor Green
Write-Host ""
