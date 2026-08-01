#!/usr/bin/env sh
set -eu

INSTALL_DIR="${SPV_INSTALL_DIR:-/opt/secure-personal-vault}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this updater as root." >&2
  exit 1
fi

if [ ! -d "$INSTALL_DIR/.git" ] || [ ! -f "$INSTALL_DIR/.env" ]; then
  echo "No installation found at $INSTALL_DIR." >&2
  exit 1
fi

cd "$INSTALL_DIR"
git pull --ff-only
docker compose config --quiet
docker compose build app
docker compose --profile tools run --rm migrate
AUTHORIZATION_MODE="$(sed -n 's/^DATABASE_AUTHORIZATION_MODE=//p' .env | tail -n 1)"
AUTHORIZATION_MODE="${AUTHORIZATION_MODE:-supabase-rls}"
if [ "$AUTHORIZATION_MODE" = "supabase-rls" ]; then
  docker compose --profile tools run --rm rls
fi
docker compose up -d app
docker image prune -f --filter "label=com.docker.compose.project=secure-personal-vault"

echo "Secure Personal Vault has been updated."
