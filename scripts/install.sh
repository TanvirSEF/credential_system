#!/usr/bin/env sh
set -eu

INSTALL_DIR="${SPV_INSTALL_DIR:-/opt/secure-personal-vault}"
REPOSITORY_URL="${SPV_REPOSITORY_URL:-https://github.com/TanvirSEF/credential_system.git}"
GITHUB_REPOSITORY="${SP_VAULT_GITHUB_REPOSITORY:-TanvirSEF/credential_system}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this installer as root (for example: curl ... | sudo sh)." >&2
  exit 1
fi

for command_name in git docker curl; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing prerequisite: $command_name" >&2
    echo "Install Git, curl, and Docker Engine with the Docker Compose plugin, then rerun." >&2
    exit 1
  fi
done

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required (the 'docker compose' command)." >&2
  exit 1
fi

if [ ! -r /dev/tty ]; then
  echo "An interactive terminal is required for installation." >&2
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
    if [ -n "$PROMPT_VALUE" ]; then return; fi
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
  while :; do
    printf "%s: " "$prompt_label" >/dev/tty
    stty -echo </dev/tty
    IFS= read -r PROMPT_VALUE </dev/tty
    restore_terminal
    echo >/dev/tty
    if [ -n "$PROMPT_VALUE" ]; then return; fi
    echo "A value is required." >/dev/tty
  done
}

write_env() {
  env_key="$1"
  env_value="$2"
  escaped_value="$(printf '%s' "$env_value" | sed 's/\\/\\\\/g; s/"/\\"/g')"
  printf '%s="%s"\n' "$env_key" "$escaped_value" >>.env
}

read_env() {
  env_key="$1"
  env_value="$(sed -n "s/^${env_key}=//p" .env | tail -n 1)"
  case "$env_value" in
    \"*\") env_value="${env_value#\"}"; env_value="${env_value%\"}" ;;
  esac
  printf '%s' "$env_value"
}

latest_release_tag() {
  release_json="$(
    curl --fail --silent --show-error --location --max-time 10 \
      -H "Accept: application/vnd.github+json" \
      -H "User-Agent: secure-personal-vault-installer" \
      -H "X-GitHub-Api-Version: 2026-03-10" \
      "https://api.github.com/repos/$GITHUB_REPOSITORY/releases/latest"
  )" || return 1
  printf '%s\n' "$release_json" |
    sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' |
    head -n 1
}

if [ -d "$INSTALL_DIR/.git" ]; then
  echo "Existing installation detected in $INSTALL_DIR; configuration will be preserved."
  if ! git -C "$INSTALL_DIR" diff --quiet || ! git -C "$INSTALL_DIR" diff --cached --quiet; then
    echo "Tracked files have local changes. Commit or revert them before reinstalling." >&2
    exit 1
  fi
  if release_tag="$(latest_release_tag)" && [ -n "$release_tag" ]; then
    if ! printf '%s\n' "$release_tag" | grep -Eq '^v?[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9._-]+)?$'; then
      echo "GitHub returned a release tag that is not semantic versioning." >&2
      exit 1
    fi
    echo "Selecting latest published release: $release_tag"
    git -C "$INSTALL_DIR" fetch --force origin "refs/tags/$release_tag:refs/tags/$release_tag"
    git -C "$INSTALL_DIR" checkout --detach "$release_tag"
  else
    echo "No published GitHub release found; keeping the current checkout."
  fi
else
  echo "Installing Secure Personal Vault in $INSTALL_DIR..."
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone "$REPOSITORY_URL" "$INSTALL_DIR"

  if release_tag="$(latest_release_tag)" && [ -n "$release_tag" ]; then
    if ! printf '%s\n' "$release_tag" | grep -Eq '^v?[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9._-]+)?$'; then
      echo "GitHub returned a release tag that is not semantic versioning." >&2
      exit 1
    fi
    echo "Selecting latest published release: $release_tag"
    git -C "$INSTALL_DIR" fetch --force origin "refs/tags/$release_tag:refs/tags/$release_tag"
    git -C "$INSTALL_DIR" checkout --detach "$release_tag"
  else
    echo "No published GitHub release found; installing the repository default branch."
  fi
fi

cd "$INSTALL_DIR"
chmod +x scripts/install.sh scripts/update.sh

if [ ! -f .env ]; then
  echo
  echo "Secure Personal Vault first-time configuration"
  echo "Long-lived secrets are saved only to $INSTALL_DIR/.env (mode 600)."
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

  installed_version="$(git describe --tags --exact-match 2>/dev/null || true)"
  if [ -z "$installed_version" ]; then
    installed_version="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' package.json | head -n 1)"
  fi
  installed_version="${installed_version:-development}"

  : >.env
  write_env APP_PORT "$app_port"
  write_env APP_VERSION "$installed_version"
  write_env SP_VAULT_GITHUB_REPOSITORY "$GITHUB_REPOSITORY"
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
  echo "Configuration saved."
fi

owner_user_id="$(read_env INSTANCE_OWNER_USER_ID)"
needs_owner_bootstrap="false"
if [ -z "$owner_user_id" ]; then
  needs_owner_bootstrap="true"
  echo
  echo "Instance owner account"
  echo "The login password and service-role key are used once and are never saved."
  prompt_default "Owner full name" "Instance Owner"
  owner_full_name="$PROMPT_VALUE"
  prompt_required "Owner login email"
  owner_email="$PROMPT_VALUE"
  prompt_secret "Owner login password (minimum 8 characters, input hidden)"
  owner_password="$PROMPT_VALUE"
  if [ "${#owner_password}" -lt 8 ]; then
    echo "Owner login password must have at least 8 characters." >&2
    exit 1
  fi
  prompt_secret "Confirm owner login password (input hidden)"
  if [ "$PROMPT_VALUE" != "$owner_password" ]; then
    echo "Owner login passwords do not match." >&2
    exit 1
  fi
  prompt_secret "Supabase service-role key for one-time account creation (input hidden)"
  supabase_service_role_key="$PROMPT_VALUE"
fi

echo "Validating deployment configuration..."
docker compose config --quiet

echo "Building application image..."
docker compose build app

database_setup_mode="$(read_env DATABASE_SETUP_MODE)"
database_setup_mode="${database_setup_mode:-existing}"
case "$database_setup_mode" in
  existing)
    echo "Using the existing database schema; migrations and RLS setup are skipped."
    ;;
  migrate)
    echo "Applying database migrations..."
    docker compose --profile tools run --rm migrate
    authorization_mode="$(read_env DATABASE_AUTHORIZATION_MODE)"
    authorization_mode="${authorization_mode:-supabase-rls}"
    if [ "$authorization_mode" = "supabase-rls" ]; then
      echo "Applying Supabase RLS policies..."
      docker compose --profile tools run --rm rls
    fi
    ;;
  *)
    echo "DATABASE_SETUP_MODE must be 'existing' or 'migrate'." >&2
    exit 1
    ;;
esac

if [ "$needs_owner_bootstrap" = "true" ]; then
  echo "Creating and confirming the instance owner account..."
  bootstrap_output="$(
    printf '%s\n%s\n%s\n%s\n' \
      "$supabase_service_role_key" "$owner_email" "$owner_password" "$owner_full_name" |
      docker compose run --rm --no-deps -T app node scripts/bootstrap-owner.mjs
  )"
  owner_user_id="$(printf '%s\n' "$bootstrap_output" | sed -n 's/^OWNER_USER_ID=//p' | tail -n 1)"
  if [ -z "$owner_user_id" ]; then
    echo "The owner account was created, but its user ID could not be read." >&2
    exit 1
  fi
  write_env INSTANCE_OWNER_USER_ID "$owner_user_id"
  chmod 600 .env
  unset owner_password supabase_service_role_key PROMPT_VALUE
  echo "Instance owner configured. Login credentials were not saved locally."
fi

echo "Starting Secure Personal Vault..."
docker compose up -d app

app_port="$(read_env APP_PORT)"
app_port="${app_port:-3000}"
trap - INT TERM HUP
echo
echo "Installation complete. Health check: http://SERVER_IP:$app_port/api/health"
echo "Log in with the owner account, then create the separate Master Password in the browser."
echo "Place a TLS reverse proxy (Caddy, Nginx, or Dokploy) in front of port $app_port."
