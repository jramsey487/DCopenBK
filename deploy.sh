
#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Installing frontend dependencies..."
cd frontend
npm install

echo "==> Building frontend..."
npm run build

echo "==> Arranging build files for Django..."
mkdir -p build/root

# Move all build items except index.html and root into root.
# This includes static/, which Django expects at build/root/static.
for item in build/* build/.[!.]* build/..?*; do
    [ -e "$item" ] || continue

    name="${item##*/}"

    case "$name" in
        index.html|root)
            continue
            ;;
    esac

    mv "$item" build/root/
done

cd ..

echo "==> Verifying expected directories..."
test -d frontend/build/root/static

echo "==> Frontend preparation complete."
