#!/usr/bin/env bash
# One-time setup for the MERN study platform.
# Run from the mern-app/ folder:  bash setup.sh
set -e
cd "$(dirname "$0")"

echo "▶ 1/5  Creating server/.env (if missing)…"
if [ ! -f .env ]; then cp .env.example .env; echo "   created .env from .env.example"; fi
# server reads its own .env; symlink/copy so it picks up the same values
cp -f .env server/.env

echo "▶ 2/5  Starting MongoDB (Docker)…"
docker compose up -d
echo "   waiting for Mongo to accept connections…"
for i in $(seq 1 30); do
  if docker exec se-exit-mongo mongosh --quiet --eval 'db.runCommand({ping:1})' >/dev/null 2>&1; then
    echo "   Mongo is up."; break
  fi
  sleep 1
done

echo "▶ 3/5  Installing server deps…"
( cd server && npm install )

echo "▶ 4/5  Installing client deps…"
( cd client && npm install )

echo "▶ 5/5  Importing all notes + questions into MongoDB…"
( cd server && npm run import )

echo ""
echo "✅ Done. Now run the app in two terminals:"
echo "   Terminal 1:  cd mern-app/server && npm run dev"
echo "   Terminal 2:  cd mern-app/client && npm run dev"
echo "   then open http://localhost:5173"
