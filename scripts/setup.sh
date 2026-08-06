#!/usr/bin/env bash
# One-shot local setup for macOS / Linux.
# Usage (from repo root):
#   chmod +x scripts/setup.sh
#   ./scripts/setup.sh
#
# Prerequisites (install yourself first):
#   - Python 3.10
#   - Node.js 18+ (LTS is fine)
#   - Git
#   - PostgreSQL with a database matching DATABASE_URL in .env

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> DCopenBK local setup (macOS / Linux)"
echo "    Project root: $ROOT"
echo

# --- Checks -----------------------------------------------------------------
if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 not found. Install Python 3.10 and retry."
  exit 1
fi

PY_VER="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
case "$PY_VER" in
  3.10) ;;
  *)
    echo "WARNING: This project expects Python 3.10 (found $PY_VER)."
    echo "         Continuing, but installs may fail."
    ;;
esac

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm not found. Install Node.js from https://nodejs.org/ and retry."
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git not found (needed to install the rcal dependency)."
  exit 1
fi

# --- .env -------------------------------------------------------------------
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "==> Created .env from .env.example (DEBUG=True)"
  else
    printf 'DEBUG=True\n' > .env
    echo "==> Created minimal .env with DEBUG=True"
  fi
else
  echo "==> .env already exists — leaving it unchanged"
fi

# --- Python venv + deps -----------------------------------------------------
if [[ ! -d .venv ]]; then
  echo "==> Creating virtualenv (.venv)"
  python3 -m venv .venv
else
  echo "==> Virtualenv .venv already exists"
fi

# shellcheck disable=SC1091
source .venv/bin/activate

echo "==> Upgrading pip / setuptools / wheel"
python -m pip install --upgrade pip setuptools wheel

echo "==> Installing Python dependencies (requirements.txt)"
python -m pip install -r requirements.txt

echo "==> Running migrations"
python manage.py migrate

echo "==> Bootstrapping default local chairperson (local.chair / password)"
python manage.py bootstrap_dev || {
  echo
  echo "WARNING: bootstrap_dev failed."
  echo "  Usually this means Postgres is not running, or DATABASE_URL in .env"
  echo "  does not match your local DB user/password/database name."
  echo "  Fix Postgres, then re-run:"
  echo "    source .venv/bin/activate && python manage.py migrate && python manage.py bootstrap_dev"
  echo
}

# --- Frontend ---------------------------------------------------------------
echo "==> Installing frontend dependencies"
(
  cd frontend
  npm install
)

cat <<'EOF'

==> Setup complete.

Start the API (terminal 1):
  source .venv/bin/activate
  python manage.py runserver

Start the React app (terminal 2):
  cd frontend
  npm start

Log in as:  local.chair  /  password
Then open /debug to seed more data, or:
  python manage.py create_dev_user --first Jane --last Doe --role ballkid

EOF
