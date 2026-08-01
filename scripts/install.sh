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
  if [ ! -r /dev/tty ]; then
    echo "An interactive terminal is required for first-time configuration." >&2
    exit 1
  fi

  restore_terminal() {
    stty echo </dev/tty 2>/dev/null || true
  }
  trap 'restore_terminal; exit 1' INT TERM HUP

  prompt_required() {
    prompt_label="$1"
    while :; do
      printf "%s: " "$prompt_label" >/dev/tty
      IFS= read -r PROMPT_VALUE </dev/tty
      if [ -n "$PROMPT_VALUE" ]; then
        return
      fi
      echo "A value is required." >/dev/tty
    done
  }

  prompt_optional() {
    prompt_label="$1"
    printf "%s (optional, press Enter to skip): " "$prompt_label" >/dev/tty
    IFS= read -r PROMPT_VALUE </dev/tty
  }

  prompt_default() {
    prompt_label="$1"
    prompt_default_value="$2"
    printf "%s [%s]: " "$prompt_label" "$prompt_default_value" >/dev/tty
    IFS= read -r PROMPT_VALUE </dev/tty
    PROMPT_VALUE="${PROMPT_VALUE:-$prompt_default_value}"
  }

  prompt_secret() {
    prompt_label="$1"
    printf "%s: " "$prompt_label" >/dev/tty
    stty -echo </dev/tty
    IFS= read -r PROMPT_VALUE </dev/tty
    restore_terminal
    echo >/dev/tty
    if [ -z "$PROMPT_VALUE" ]; then
      echo "A value is required." >/dev/tty
      prompt_secret "$prompt_label"
    fi
  }

  write_env() {
    env_key="$1"
    env_value="$2"
    escaped_value="$(printf '%s' "$env_value" | sed 's/\\/\\\\/g; s/"/\\"/g')"
    printf '%s="%s"\n' "$env_key" "$escaped_value" >>.env
  }

  echo
  echo "Secure Personal Vault first-time configuration"
  echo "Secrets are written only to $INSTALL_DIR/.env (mode 600)."
  echo

  prompt_default "Public application port" "3000"
  app_port="$PROMPT_VALUE"
  case "$app_port" in
    *[!0-9]*|'') echo "Application port must be a number." >&2; exit 1 ;;
  esac
  prompt_required "Supabase project URL"
  supabase_url="$PROMPT_VALUE"
  prompt_secret "Supabase publishable key (input hidden)"
  supabase_key="$PROMPT_VALUE"
  prompt_secret "PostgreSQL DATABASE_URL (input hidden)"
  database_url="$PROMPT_VALUE"
  prompt_optional "PostgreSQL DIRECT_URL"
  direct_url="$PROMPT_VALUE"
  prompt_default "Is the database schema already set up? (yes/no)" "yes"
  case "$PROMPT_VALUE" in
    yes|YES|y|Y) database_setup_mode="existing" ;;
    no|NO|n|N) database_setup_mode="migrate" ;;
    *) echo "Please answer yes or no." >&2; exit 1 ;;
  esac
  prompt_default "Database authorization mode (supabase-rls/application)" "supabase-rls"
  database_authorization_mode="$PROMPT_VALUE"
  case "$database_authorization_mode" in
    supabase-rls|application) ;;
    *) echo "Authorization mode must be supabase-rls or application." >&2; exit 1 ;;
  esac

  prompt_required "S3-compatible storage endpoint"
  storage_endpoint="$PROMPT_VALUE"
  prompt_default "Storage region" "auto"
  storage_region="$PROMPT_VALUE"
  prompt_required "Storage bucket name"
  storage_bucket="$PROMPT_VALUE"
  prompt_secret "Storage access key ID (input hidden)"
  storage_access_key="$PROMPT_VALUE"
  prompt_secret "Storage secret access key (input hidden)"
  storage_secret_key="$PROMPT_VALUE"
  prompt_default "Use S3 path-style URLs? (true for MinIO)" "false"
  storage_path_style="$PROMPT_VALUE"
  case "$storage_path_style" in
    true|false) ;;
    *) echo "Path-style value must be true or false." >&2; exit 1 ;;
  esac
  prompt_required "Public storage URL"
  storage_public_url="$PROMPT_VALUE"

  : >.env
  write_env APP_PORT "$app_port"
  write_env APP_VERSION "local"
  write_env NEXT_PUBLIC_SUPABASE_URL "$supabase_url"
  write_env NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "$supabase_key"
  write_env DATABASE_PROVIDER "postgresql"
  write_env DATABASE_URL "$database_url"
  write_env DIRECT_URL "$direct_url"
  write_env DATABASE_SETUP_MODE "$database_setup_mode"
  write_env DATABASE_AUTHORIZATION_MODE "$database_authorization_mode"
  write_env STORAGE_PROVIDER "s3-compatible"
  write_env STORAGE_S3_ENDPOINT "$storage_endpoint"
  write_env STORAGE_S3_REGION "$storage_region"
  write_env STORAGE_S3_BUCKET "$storage_bucket"
  write_env STORAGE_S3_ACCESS_KEY_ID "$storage_access_key"
  write_env STORAGE_S3_SECRET_ACCESS_KEY "$storage_secret_key"
  write_env STORAGE_S3_FORCE_PATH_STYLE "$storage_path_style"
  write_env STORAGE_PUBLIC_URL "$storage_public_url"
  chmod 600 .env
  trap - INT TERM HUP
  echo "Configuration saved. Continuing installation..."
fi

echo "Validating deployment configuration..."
docker compose config --quiet

echo "Building application image..."
docker compose build app

DATABASE_SETUP_MODE="$(sed -n 's/^DATABASE_SETUP_MODE=//p' .env | tail -n 1)"
DATABASE_SETUP_MODE="${DATABASE_SETUP_MODE:-existing}"
case "$DATABASE_SETUP_MODE" in
  existing)
    echo "Using the existing database schema; migrations and RLS setup are skipped."
    ;;
  migrate)
    echo "Applying database migrations..."
    docker compose --profile tools run --rm migrate

    AUTHORIZATION_MODE="$(sed -n 's/^DATABASE_AUTHORIZATION_MODE=//p' .env | tail -n 1)"
    AUTHORIZATION_MODE="${AUTHORIZATION_MODE:-supabase-rls}"
    if [ "$AUTHORIZATION_MODE" = "supabase-rls" ]; then
      echo "Applying Supabase RLS policies..."
      docker compose --profile tools run --rm rls
    fi
    ;;
  *)
    echo "DATABASE_SETUP_MODE must be 'existing' or 'migrate'." >&2
    exit 1
    ;;
esac

echo "Starting Secure Personal Vault..."
docker compose up -d app

APP_PORT="$(sed -n 's/^APP_PORT=//p' .env | tail -n 1)"
APP_PORT="${APP_PORT:-3000}"
echo
echo "Installation complete. Health check: http://SERVER_IP:$APP_PORT/api/health"
echo "Place a TLS reverse proxy (Caddy, Nginx, or Dokploy) in front of port $APP_PORT."
