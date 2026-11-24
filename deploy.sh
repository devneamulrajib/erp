#!/bin/bash
# ERP auto-deploy script (runs on cPanel via cron)

REPO=/home/agruokni/repositories/erp
FRONT=/home/agruokni/erp.mwm247.com
BACK=/home/agruokni/api.erp.mwm247.com

echo "=============================="
echo "Deploy started: $(date)"

# ---------- 1. Frontend (built dist files) ----------
# Copies the committed build output from client/dist (run `npm run build` in
# client/ and commit client/dist before pushing). Nothing is built on the server.
# --delete removes old hashed bundles, but these are protected/never copied:
#   .htaccess (SPA rewrites), .well-known (SSL validation), cgi-bin,
#   dist.zip (local upload archive - must not be public).
if [ -f "$REPO/client/dist/index.html" ]; then
  rsync -a --delete \
    --exclude '.htaccess' \
    --exclude '.well-known' \
    --exclude 'cgi-bin' \
    --exclude 'dist.zip' \
    "$REPO/client/dist/" "$FRONT/"
  echo "Frontend updated"
else
  echo "Frontend skipped: $REPO/client/dist/index.html not found"
fi

# ---------- 2. Backend (protects .env, uploads, node_modules, tmp) ----------
# Change "server" if your local folder name is different
rsync -a \
  --exclude '.env' \
  --exclude 'uploads' \
  --exclude 'node_modules' \
  --exclude 'tmp' \
  --exclude '.htaccess' \
  --exclude 'stderr.log' \
  --exclude '.migrated' \
  "$REPO/server/" "$BACK/"
echo "Backend updated"

# ---------- 3. Activate Node (cron doesn't know where node is) ----------
source "$(ls -d /home/agruokni/nodevenv/api.erp.mwm247.com/*/bin/activate | tail -1)"

# ---------- 4. Install packages ----------
cd "$BACK" || exit 1
npm install --production
echo "Packages installed"

# ---------- 5. Run new migrations (each file runs only once) ----------
if [ ! -f .migrated ]; then
  ls migrate-*.js > .migrated 2>/dev/null   # first time: mark existing ones as done
  touch .migrated
fi

for f in migrate-*.js; do
  [ -e "$f" ] || continue
  if ! grep -qx "$f" .migrated; then
    echo "Running migration: $f"
    if node "$f"; then
      echo "$f" >> .migrated
      echo "Done: $f"
    else
      echo "FAILED: $f"
    fi
  fi
done

# ---------- 6. Restart backend ----------
mkdir -p tmp && touch tmp/restart.txt
echo "Backend restarted"

echo "Deploy finished: $(date)"