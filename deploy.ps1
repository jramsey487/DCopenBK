# DCopenBK deployment script
# Run from PowerShell with:
# .\deploy.ps1
#
# By default, this script REUSES an existing frontend\node_modules directory.
# This is intentional: Window 2 runs `npm start`, and Windows can fail `npm ci`
# with ENOTEMPTY while node_modules is in use by the dev server.
#
# If node_modules is missing, the script automatically runs npm ci.
# To intentionally reinstall dependencies, stop Window 2 first and run:
# .\deploy.ps1 -InstallDependencies

param(
    [switch]$InstallDependencies
)

$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------

$ProjectRoot = "C:\Users\Public\Documents\DCopenBK"
$FrontendDir = Join-Path $ProjectRoot "frontend"
$NodeModulesDir = Join-Path $FrontendDir "node_modules"
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
Write-Host "Using npm $PinnedNpmVersion for the frontend build." -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------
# Build frontend
# ------------------------------------------------------------

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       Building Frontend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $FrontendDir

# IMPORTANT:
# Do not run npm ci on every deployment. Window 2 normally has the React
# development server using node_modules, and Windows may reject npm ci with:
# ENOTEMPTY ... node_modules\.cache\babel-loader
# Reuse an existing installation and only install when it is actually needed.

if ($InstallDependencies -or -not (Test-Path $NodeModulesDir)) {
    if ($InstallDependencies) {
        Write-Host "Explicit dependency reinstall requested." -ForegroundColor Yellow
    } else {
        Write-Host "frontend\node_modules is missing; installing dependencies." -ForegroundColor Yellow
    }

    Write-Host "Installing dependencies from package-lock.json with npm $PinnedNpmVersion..." -ForegroundColor Yellow
    Write-Host "This uses 'npm ci' and does not rewrite package-lock.json." -ForegroundColor DarkGray
    Write-Host ""

    npx --yes "npm@$PinnedNpmVersion" ci

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERROR: npm $PinnedNpmVersion ci failed." -ForegroundColor Red
        Write-Host "Deployment stopped. The existing lockfile was not intentionally regenerated." -ForegroundColor Red
        exit 1
    }

    Write-Host "Dependencies installed successfully." -ForegroundColor Green
} else {
    Write-Host "Existing frontend\node_modules found; skipping npm ci." -ForegroundColor Green
    Write-Host "This keeps deployment compatible with the React dev server in Window 2." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Building production frontend with npm $PinnedNpmVersion..." -ForegroundColor Yellow
Write-Host ""

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

# The React build creates a fresh build directory, but make sure the root
# staging directory exists before moving the non-standard root files into it.
New-Item -ItemType Directory -Force -Path $BuildRootDir | Out-Null

# Move everything except index.html, static, and root into build/root.
# This preserves the existing DCopenBK deployment layout.
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
