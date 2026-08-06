# One-shot local setup for Windows PowerShell.
# Usage (from repo root):
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser   # once, if needed
#   .\scripts\setup.ps1
#
# Prerequisites (install yourself first):
#   - Python 3.10
#   - Node.js 18+ (LTS is fine)
#   - Git
#   - PostgreSQL with a database matching DATABASE_URL in .env
#   - If native builds fail: Visual C++ Build Tools
#       https://visualstudio.microsoft.com/visual-cpp-build-tools/

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

Write-Host "==> DCopenBK local setup (Windows PowerShell)"
Write-Host "    Project root: $Root"
Write-Host ""

function Assert-Command($Name, $Hint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "ERROR: '$Name' not found. $Hint"
  }
}

Assert-Command "python" "Install Python 3.10 and ensure it is on PATH."
Assert-Command "npm" "Install Node.js from https://nodejs.org/ and retry."
Assert-Command "git" "Install Git (needed to install the rcal dependency)."

$pyVer = & python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
if ($pyVer -ne "3.10") {
  Write-Host "WARNING: This project expects Python 3.10 (found $pyVer)."
  Write-Host "         Continuing, but installs may fail."
}

# --- .env -------------------------------------------------------------------
if (-not (Test-Path ".env")) {
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env"
    Write-Host "==> Created .env from .env.example (DEBUG=True)"
  } else {
    Set-Content -Path ".env" -Value "DEBUG=True"
    Write-Host "==> Created minimal .env with DEBUG=True"
  }
} else {
  Write-Host "==> .env already exists — leaving it unchanged"
}

# --- Python venv + deps -----------------------------------------------------
if (-not (Test-Path ".venv")) {
  Write-Host "==> Creating virtualenv (.venv)"
  python -m venv .venv
} else {
  Write-Host "==> Virtualenv .venv already exists"
}

$activate = Join-Path $Root ".venv\Scripts\Activate.ps1"
. $activate

Write-Host "==> Upgrading pip / setuptools / wheel"
python -m pip install --upgrade pip setuptools wheel

Write-Host "==> Installing Python dependencies (requirements.txt)"
python -m pip install -r requirements.txt

Write-Host "==> Running migrations"
python manage.py migrate

Write-Host "==> Bootstrapping default local chairperson (local.chair / password)"
try {
  python manage.py bootstrap_dev
} catch {
  Write-Host ""
  Write-Host "WARNING: bootstrap_dev failed."
  Write-Host "  Usually this means Postgres is not running, or DATABASE_URL in .env"
  Write-Host "  does not match your local DB user/password/database name."
  Write-Host "  Fix Postgres, then re-run:"
  Write-Host "    .\.venv\Scripts\Activate.ps1"
  Write-Host "    python manage.py migrate"
  Write-Host "    python manage.py bootstrap_dev"
  Write-Host ""
}

# --- Frontend ---------------------------------------------------------------
Write-Host "==> Installing frontend dependencies"
Push-Location "frontend"
try {
  npm install
} finally {
  Pop-Location
}

Write-Host @"

==> Setup complete.

Start the API (terminal 1):
  .\.venv\Scripts\Activate.ps1
  python manage.py runserver

Start the React app (terminal 2):
  cd frontend
  npm start

Log in as:  local.chair  /  password
Then open /debug to seed more data, or:
  python manage.py create_dev_user --first Jane --last Doe --role ballkid

"@
