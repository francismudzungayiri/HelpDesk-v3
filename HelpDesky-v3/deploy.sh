#!/usr/bin/env bash
set -Eeuo pipefail

# HelpDesky one-time deployment script for openSUSE Leap.
# Usage example:
#   sudo REPO_URL="https://github.com/your-org/helpdesky.git" \
#        DOMAIN="helpdesk.example.com" \
#        DB_PASSWORD="strong-db-password" \
#        JWT_SECRET="very-long-random-secret" \
#        bash deploy.sh

APP_NAME="${APP_NAME:-helpdesky}"
APP_USER="${APP_USER:-${SUDO_USER:-$USER}}"
APP_ROOT="${APP_ROOT:-/opt/helpdesky}"
APP_DIR="${APP_DIR:-$APP_ROOT/app}"
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"
DOMAIN="${DOMAIN:-helpdesk.example.com}"
API_PORT="${API_PORT:-5001}"

DB_NAME="${DB_NAME:-helpdesky}"
DB_USER="${DB_USER:-helpdesky_user}"
DB_PASSWORD="${DB_PASSWORD:-}"

JWT_SECRET="${JWT_SECRET:-}"
SEED_ADMIN_USERNAME="${SEED_ADMIN_USERNAME:-admin}"
SEED_ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-}"
SEED_ADMIN_NAME="${SEED_ADMIN_NAME:-System Admin}"

ENABLE_TLS="${ENABLE_TLS:-false}"          # true or false
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}" # required if ENABLE_TLS=true

log() {
  printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

die() {
  echo "Error: $*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

if [[ $EUID -ne 0 ]]; then
  die "Run with sudo/root (for package install, systemd, nginx, firewall)."
fi

if [[ -z "$REPO_URL" ]]; then
  die "Set REPO_URL, for example: REPO_URL=https://github.com/org/repo.git"
fi

if [[ -z "$DB_PASSWORD" ]]; then
  die "Set DB_PASSWORD to a strong password."
fi

if [[ -z "$JWT_SECRET" ]]; then
  die "Set JWT_SECRET to a long random secret."
fi

if [[ "$ENABLE_TLS" == "true" && -z "$LETSENCRYPT_EMAIL" ]]; then
  die "Set LETSENCRYPT_EMAIL when ENABLE_TLS=true."
fi

need_cmd zypper

log "Installing system packages"
zypper --non-interactive refresh
zypper --non-interactive install \
  git nginx postgresql postgresql-server postgresql-contrib \
  nodejs npm firewalld curl

need_cmd node
need_cmd npm
need_cmd git

log "Starting and enabling required services"
systemctl enable --now postgresql
systemctl enable --now firewalld

log "Preparing application directory"
mkdir -p "$APP_ROOT"
chown -R "$APP_USER":"$APP_USER" "$APP_ROOT"

if [[ -d "$APP_DIR/.git" ]]; then
  log "Repository already exists, pulling latest $BRANCH"
  sudo -u "$APP_USER" git -C "$APP_DIR" fetch --all --prune
  sudo -u "$APP_USER" git -C "$APP_DIR" checkout "$BRANCH"
  sudo -u "$APP_USER" git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
else
  log "Cloning repository"
  sudo -u "$APP_USER" git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

log "Installing Node dependencies"
sudo -u "$APP_USER" npm --prefix "$APP_DIR/server" ci
sudo -u "$APP_USER" npm --prefix "$APP_DIR/client" ci

log "Creating PostgreSQL role/database if missing"
sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;
SQL

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"

log "Writing server environment file"
cat > "$APP_DIR/server/.env" <<EOF
PORT=${API_PORT}
JWT_SECRET=${JWT_SECRET}
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USERNAME=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
CORS_ORIGINS=https://${DOMAIN}
# One nginx proxy sits in front of the API; without this rate limiting sees
# every request as coming from 127.0.0.1.
TRUST_PROXY=1
SEED_ADMIN_USERNAME=${SEED_ADMIN_USERNAME}
SEED_ADMIN_PASSWORD=${SEED_ADMIN_PASSWORD}
SEED_ADMIN_NAME=${SEED_ADMIN_NAME}
EOF
chown "$APP_USER":"$APP_USER" "$APP_DIR/server/.env"
chmod 600 "$APP_DIR/server/.env"

log "Writing frontend production environment file"
cat > "$APP_DIR/client/.env.production" <<EOF
VITE_API_URL=/api
EOF
chown "$APP_USER":"$APP_USER" "$APP_DIR/client/.env.production"

log "Initializing database schema and building frontend"
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR/server' && node init_db.js"
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR/client' && npm run build"

NODE_BIN="$(command -v node)"
log "Creating systemd service"
cat > "/etc/systemd/system/${APP_NAME}-api.service" <<EOF
[Unit]
Description=${APP_NAME} API
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}/server
ExecStart=${NODE_BIN} server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now "${APP_NAME}-api.service"

log "Creating nginx site config"
cat > "/etc/nginx/vhosts.d/${APP_NAME}.conf" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    root ${APP_DIR}/client/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri /index.html;
    }
}
EOF

nginx -t
systemctl enable --now nginx
systemctl reload nginx

log "Opening firewall ports"
firewall-cmd --permanent --zone=public --add-service=http
firewall-cmd --permanent --zone=public --add-service=https
firewall-cmd --reload

if [[ "$ENABLE_TLS" == "true" ]]; then
  log "Installing certbot and requesting TLS certificate"
  zypper --non-interactive install python3-certbot python3-certbot-nginx certbot-systemd-timer
  certbot --nginx -d "$DOMAIN" -m "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email --redirect -n
  systemctl enable --now certbot-renew.timer
fi

log "Deployment completed"
echo "Check service status with:"
echo "  systemctl status ${APP_NAME}-api.service nginx postgresql --no-pager"
