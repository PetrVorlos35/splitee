#!/usr/bin/env bash
set -euo pipefail

HOST=ubuntu@130.61.122.142
DIR=/home/ubuntu/splitee
CONVEX_URL="${NEXT_PUBLIC_CONVEX_URL:?Nastav NEXT_PUBLIC_CONVEX_URL na produkční Convex URL}"

rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude docs --exclude .env.local \
  --exclude .claude --exclude .superpowers \
  ./ "$HOST:$DIR/"

ssh "$HOST" "
  cd $DIR &&
  sudo docker build --build-arg NEXT_PUBLIC_CONVEX_URL='$CONVEX_URL' -t splitee . &&
  sudo docker rm -f splitee 2>/dev/null || true &&
  sudo docker run -d --name splitee \
    -p 127.0.0.1:3011:3000 \
    --restart unless-stopped \
    splitee &&
  sleep 4 &&
  curl -sf http://127.0.0.1:3011/ > /dev/null && echo 'DEPLOY OK'
"
