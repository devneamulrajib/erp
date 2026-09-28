#!/bin/bash
# ERP auto-deploy script (runs on cPanel via cron)

REPO=/home/agruokni/repositories/erp
FRONT=/home/agruokni/erp.mwm247.com
BACK=/home/agruokni/api.erp.mwm247.com

echo "=============================="
echo "Deploy started: $(date)"

# ---------- 1. Frontend (built dist files) ----------
# Change "frontend/dist" if your local folder name is different
rsync -a --delete "$REPO/frontend/dist/" "$FRONT/"
echo "Frontend updated"

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