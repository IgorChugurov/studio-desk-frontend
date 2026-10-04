#!/usr/bin/env bash
# Deploys one frontend version on the server. Called by GitHub Actions:
#   bash /opt/studio-desk/frontend/deploy.sh <image-tag>
# See studio-desk-docs/03-architecture/deployment.md.
set -euo pipefail

TAG="${1:?usage: deploy.sh <image-tag>}"
IMAGE="ghcr.io/igorchugurov/studio-desk-frontend"
# The frontend chooses what to show by the request host, so the check sends
# the host of the platform admin.
HEALTH_HOST="admin.studio-desk.axondigital.xyz"
KEEP_IMAGES=5

cd "$(dirname "$0")"
[ -f image.env ] || echo "IMAGE_TAG=none" > image.env

# The shell value of IMAGE_TAG wins over image.env, which keeps the running
# version until the new one has started.
compose() { docker compose --env-file image.env "$@"; }
next() { IMAGE_TAG="$TAG" compose "$@"; }

echo "==> Pull $IMAGE:$TAG"
next pull frontend

echo "==> Start frontend"
next up -d frontend
echo "IMAGE_TAG=$TAG" > image.env

echo "==> Health check"
for _ in $(seq 1 15); do
  if curl -fsS -o /dev/null -H "Host: $HEALTH_HOST" http://127.0.0.1:3101/; then
    healthy=1
    break
  fi
  sleep 2
done
if [ -z "${healthy:-}" ]; then
  echo "Health check failed" >&2
  compose logs --tail 50 frontend >&2
  exit 1
fi

echo "==> Keep the last $KEEP_IMAGES images"
docker image ls "$IMAGE" --format '{{.Repository}}:{{.Tag}}' \
  | tail -n +$((KEEP_IMAGES + 1)) \
  | xargs -r docker image rm >/dev/null 2>&1 || true

echo "==> Deployed $TAG"
