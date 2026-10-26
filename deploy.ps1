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
# Verify required commands
# ------------------------------------------------------------

Write-Host "Checking required commands..." -ForegroundColor Cyan

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: npm was not found." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command fly -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: fly CLI was not found." -ForegroundColor Red
    exit 1
}

Write-Host "npm found." -ForegroundColor Green
Write-Host "fly CLI found." -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------
# Build frontend
# ------------------------------------------------------------

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       Building Frontend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $FrontendDir

Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: npm install failed." -ForegroundColor Red
    Write-Host "Deployment stopped." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Building production frontend..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: npm run build failed." -ForegroundColor Red
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

# Create build/root if it doesn't exist
New-Item -ItemType Directory -Force -Path $BuildRootDir | Out-Null

# Move everything except:
#   index.html
#   static
#   root
#
# This matches the behavior of the existing deploy.sh script.

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