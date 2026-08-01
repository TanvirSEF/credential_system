#!/usr/bin/env sh
set -eu

INSTALL_DIR="${SPV_INSTALL_DIR:-/opt/secure-personal-vault}"
REPOSITORY_URL="${SPV_REPOSITORY_URL:-https://github.com/TanvirSEF/credential_system.git}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this installer as root (for example: curl ... | sudo sh)." >&2
  exit 1
fi

for command_name in git docker; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing prerequisite: $command_name" >&2
    echo "Install Git and Docker Engine with the Docker Compose plugin, then rerun." >&2
    exit 1
  fi
done

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required (the 'docker compose' command)." >&2
  exit 1
fi

if [ -d "$INSTALL_DIR/.git" ]; then
  echo "Updating existing installation in $INSTALL_DIR..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  echo "Installing Secure Personal Vault in $INSTALL_DIR..."
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone --depth 1 "$REPOSITORY_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
chmod +x scripts/install.sh scripts/update.sh

if [ ! -f .env ]; then
  cp .env.example .env
  chmod 600 .env
  echo
  echo "Created $INSTALL_DIR/.env"
  echo "Edit it with your Supabase, PostgreSQL, and S3-compatible storage credentials."
  echo "Then rerun this installer to validate and start the service."
  exit 0
fi

echo "Validating deployment configuration..."
docker compose config --quiet

echo "Building application image..."
docker compose build app

echo "Applying database migrations..."
docker compose --profile tools run --rm migrate

AUTHORIZATION_MODE="$(sed -n 's/^DATABASE_AUTHORIZATION_MODE=//p' .env | tail -n 1)"
AUTHORIZATION_MODE="${AUTHORIZATION_MODE:-supabase-rls}"
if [ "$AUTHORIZATION_MODE" = "supabase-rls" ]; then
  echo "Applying Supabase RLS policies..."
  docker compose --profile tools run --rm rls
fi

echo "Starting Secure Personal Vault..."
docker compose up -d app

APP_PORT="$(sed -n 's/^APP_PORT=//p' .env | tail -n 1)"
APP_PORT="${APP_PORT:-3000}"
echo
echo "Installation complete. Health check: http://SERVER_IP:$APP_PORT/api/health"
echo "Place a TLS reverse proxy (Caddy, Nginx, or Dokploy) in front of port $APP_PORT."
