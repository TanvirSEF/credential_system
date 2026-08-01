#!/usr/bin/env sh
set -eu

INSTALL_DIR="${SPV_INSTALL_DIR:-/opt/secure-personal-vault}"
DEFAULT_GITHUB_REPOSITORY="TanvirSEF/credential_system"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this updater as root." >&2
  exit 1
fi

for command_name in git docker curl; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing prerequisite: $command_name" >&2
    exit 1
  fi
done

if [ ! -d "$INSTALL_DIR/.git" ] || [ ! -f "$INSTALL_DIR/.env" ]; then
  echo "No installation found at $INSTALL_DIR." >&2
  exit 1
fi

cd "$INSTALL_DIR"

read_env() {
  env_key="$1"
  env_value="$(sed -n "s/^${env_key}=//p" .env | tail -n 1)"
  case "$env_value" in
    \"*\") env_value="${env_value#\"}"; env_value="${env_value%\"}" ;;
  esac
  printf '%s' "$env_value"
}

set_env() {
  env_key="$1"
  env_value="$2"
  temp_env="$(mktemp "$INSTALL_DIR/.env.update.XXXXXX")"
  awk -v key="$env_key" -v value="$env_value" '
    BEGIN { replaced = 0 }
    index($0, key "=") == 1 {
      print key "=\"" value "\""
      replaced = 1
      next
    }
    { print }
    END {
      if (!replaced) print key "=\"" value "\""
    }
  ' .env >"$temp_env"
  chmod 600 "$temp_env"
  mv "$temp_env" .env
}

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Tracked files have local changes. Commit or revert them before updating." >&2
  exit 1
fi

github_repository="$(read_env SP_VAULT_GITHUB_REPOSITORY)"
github_repository="${github_repository:-$DEFAULT_GITHUB_REPOSITORY}"
case "$github_repository" in
  *[!A-Za-z0-9._/-]*|*/*/*|/*|*/) echo "Invalid GitHub repository configuration." >&2; exit 1 ;;
esac
case "$github_repository" in
  */*) ;;
  *) echo "GitHub repository must use the owner/repository format." >&2; exit 1 ;;
esac

target_version="${1:-}"
if [ -z "$target_version" ]; then
  echo "Checking the latest published GitHub release..."
  release_json="$(
    curl --fail --silent --show-error --location --max-time 15 \
      -H "Accept: application/vnd.github+json" \
      -H "User-Agent: secure-personal-vault-updater" \
      -H "X-GitHub-Api-Version: 2026-03-10" \
      "https://api.github.com/repos/$github_repository/releases/latest"
  )"
  target_version="$(
    printf '%s\n' "$release_json" |
      sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' |
      head -n 1
  )"
fi

if ! printf '%s\n' "$target_version" | grep -Eq '^v?[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9._-]+)?$'; then
  echo "GitHub did not return a semantic release tag." >&2
  exit 1
fi

current_version="$(read_env APP_VERSION)"
if [ "$current_version" = "$target_version" ]; then
  echo "Secure Personal Vault $target_version is already installed."
  exit 0
fi

echo "Downloading published release $target_version..."
git fetch --force origin "refs/tags/$target_version:refs/tags/$target_version"
git checkout --detach "$target_version"
chmod +x scripts/install.sh scripts/update.sh

echo "Validating deployment configuration..."
APP_VERSION="$target_version" docker compose config --quiet

echo "Building release image..."
APP_VERSION="$target_version" docker compose build app
set_env APP_VERSION "$target_version"

database_setup_mode="$(read_env DATABASE_SETUP_MODE)"
database_setup_mode="${database_setup_mode:-existing}"
case "$database_setup_mode" in
  existing)
    echo "Using the existing database schema; migration steps are skipped."
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

docker compose up -d app
echo "Secure Personal Vault was updated to $target_version."
