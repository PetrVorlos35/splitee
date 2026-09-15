#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

HOST=ubuntu@130.61.122.142
DIR=/home/ubuntu/splitee
CONVEX_URL="${NEXT_PUBLIC_CONVEX_URL:?Nastav NEXT_PUBLIC_CONVEX_URL na produkční Convex URL}"

rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude docs --include .env.example --exclude '.env*' --exclude '*.pem' \
  --exclude .claude --exclude .superpowers \
  ./ "$HOST:$DIR/"

ssh "$HOST" "
  set -e
  cd $DIR
  sudo docker build --build-arg NEXT_PUBLIC_CONVEX_URL='$CONVEX_URL' -t splitee .
  sudo docker rm -f splitee 2>/dev/null || true
  sudo docker run -d --name splitee \
    -p 127.0.0.1:3011:3000 \
    --restart unless-stopped \
    splitee
  for i in 1 2 3 4 5 6 7 8 9 10; do
    sleep 2
    curl -sf http://127.0.0.1:3011/ > /dev/null && break || true
  done
  curl -sf http://127.0.0.1:3011/ > /dev/null && echo 'DEPLOY OK' || { echo 'DEPLOY FAILED: health check did not pass' >&2; exit 1; }
  sudo docker image prune -f || true
"
