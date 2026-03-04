#!/usr/bin/env bash
set -Eeuo pipefail

# HelpDesky update script for an already deployed server.
# Usage example:
#   sudo bash update.sh
# Optional overrides:
#   APP_DIR=/opt/helpdesky/app APP_NAME=helpdesky BRANCH=main sudo bash update.sh

APP_NAME="${APP_NAME:-helpdesky}"
APP_DIR="${APP_DIR:-/opt/helpdesky/app}"
BRANCH="${BRANCH:-main}"
APP_USER="${APP_USER:-}"

log() {
  printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

die() {
  echo "Error: $*" >&2
  exit 1
}

if [[ ! -d "$APP_DIR/.git" ]]; then
  die "App directory is not a git checkout: $APP_DIR"
fi

if [[ $EUID -eq 0 ]]; then
  if [[ -z "$APP_USER" ]]; then
    APP_USER="$(stat -c '%U' "$APP_DIR")"
  fi
  RUN_AS=(sudo -u "$APP_USER")
else
  RUN_AS=()
fi

log "Pulling latest code from branch: $BRANCH"
"${RUN_AS[@]}" git -C "$APP_DIR" fetch --all --prune
"${RUN_AS[@]}" git -C "$APP_DIR" checkout "$BRANCH"
"${RUN_AS[@]}" git -C "$APP_DIR" pull --ff-only origin "$BRANCH"

log "Installing backend dependencies and applying DB migrations"
"${RUN_AS[@]}" npm --prefix "$APP_DIR/server" ci
"${RUN_AS[@]}" npm --prefix "$APP_DIR/server" run db:migrate

log "Installing frontend dependencies and building static assets"
"${RUN_AS[@]}" npm --prefix "$APP_DIR/client" ci
"${RUN_AS[@]}" npm --prefix "$APP_DIR/client" run build

if [[ $EUID -eq 0 ]]; then
  log "Restarting API service and reloading nginx"
  systemctl restart "${APP_NAME}-api.service"
  systemctl reload nginx
  systemctl status "${APP_NAME}-api.service" --no-pager
fi

log "Update completed"
