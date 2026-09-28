#!/bin/bash
REPO=/home/agruokni/repositories/erp

# Frontend (built dist files)
rsync -a --delete $REPO/frontend/dist/ /home/agruokni/erp.mwm247.com/

# Backend (keeps your .env, uploads, node_modules, tmp safe)
rsync -a \
  --exclude '.env' --exclude 'uploads' --exclude 'node_modules' \
  --exclude 'tmp' --exclude '.htaccess' --exclude 'stderr.log' \
  $REPO/server/ /home/agruokni/api.erp.mwm247.com/

cd /home/agruokni/api.erp.mwm247.com && npm install --production
mkdir -p tmp && touch tmp/restart.txt