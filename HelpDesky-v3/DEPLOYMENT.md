# HelpDesky v3 — Deployment Guide

This guide covers deploying HelpDesky to a Linux server: prerequisites, the two
provided deployment scripts (openSUSE and Ubuntu/Debian), environment
variables, updating an existing deployment, and troubleshooting.

## 1. Architecture Recap

| Layer | Technology |
|---|---|
| Frontend | React + Vite, built to static files (`client/dist`) |
| Backend | Node.js + Express (`server/`) |
| Database | PostgreSQL |
| Auth | JWT (role-based: `ADMIN`, `AGENT`, `END_USER`) |
| Realtime | Server-Sent Events (`/api/events`) — not WebSockets |
| Reverse proxy | nginx (serves the built frontend, proxies `/api/` to the Node process) |
| Process manager | systemd (`<app-name>-api.service`) |

In production, nginx serves `client/dist` directly as static files and reverse
proxies everything under `/api/` to the Express server running on
`API_PORT` (default `5001`). Because the frontend calls `/api` as a relative
path (`VITE_API_URL=/api`), the browser only ever talks to one origin —
nginx — so CORS is largely a non-issue in this setup.

## 2. Deployment Scripts

Two one-time setup scripts are provided at the repo root, one per target
distro. Both are idempotent enough to re-run (they skip steps that are
already done, e.g. an existing DB role or an existing git checkout).

| Script | Target OS | Package manager | Firewall | nginx config path |
|---|---|---|---|---|
| [`deploy.sh`](deploy.sh) | openSUSE Leap / SLES | `zypper` | `firewalld` | `/etc/nginx/vhosts.d/` |
| [`deploy-ubuntu.sh`](deploy-ubuntu.sh) | Ubuntu / Debian | `apt-get` (+ NodeSource for Node 20.x) | `ufw` | `/etc/nginx/sites-available/` + `sites-enabled/` |

[`update.sh`](update.sh) is distro-agnostic (git/npm/systemctl/nginx only) and
works against a deployment created by either script.

Each script, in order:

1. Installs system packages (git, nginx, PostgreSQL, Node.js, firewall tool).
2. Clones (or updates) the repo into `$APP_DIR` (default `/opt/helpdesky/app`).
3. Runs `npm --prefix server ci` and `npm --prefix client ci` — the
   `--prefix` flag makes npm resolve `package.json`/`package-lock.json`
   inside that subdirectory, so this works correctly even though there is no
   lockfile at the repo root (see [Troubleshooting](#troubleshooting)).
4. Creates the PostgreSQL role and database if missing.
5. Writes `server/.env` and `client/.env.production` from the script's
   variables.
6. Runs `node init_db.js` to create the schema (and seed the admin account,
   if `SEED_ADMIN_*` are set) and `npm run build` for the frontend.
7. Creates and starts a systemd service (`<APP_NAME>-api.service`) running
   `node server.js`.
8. Writes an nginx site config, serves `client/dist`, proxies `/api/`.
9. Opens the firewall for HTTP/HTTPS (+ SSH on Ubuntu).
10. Optionally requests a Let's Encrypt certificate via certbot, if
    `ENABLE_TLS=true` and a `DOMAIN` is set.

## 3. Prerequisites

- A Linux server (openSUSE Leap or Ubuntu/Debian) with root/sudo access.
- Node.js 18+ (installed automatically by the scripts if missing/too old).
- PostgreSQL 13+ (installed automatically).
- Outbound network access to clone the repo and (on Ubuntu) to pull the
  NodeSource install script.
- If using TLS: a domain name with DNS already pointed at the server, and
  ports 80/443 reachable from the internet.

## 4. Environment Variables

These are written into `server/.env` by the deploy script. You only need to
pass the required ones (`REPO_URL`, `DB_PASSWORD`, `JWT_SECRET`) — everything
else has a sane default.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `REPO_URL` | Yes | — | Git URL to clone |
| `DB_PASSWORD` | Yes | — | Password for the app's DB role |
| `JWT_SECRET` | Yes | — | Signs auth tokens; losing/rotating it logs out all users |
| `BRANCH` | No | `main` | Git branch to deploy |
| `APP_NAME` | No | `helpdesky` | Used for the systemd unit and nginx site name |
| `APP_ROOT` / `APP_DIR` | No | `/opt/helpdesky` / `.../app` | Install location |
| `DOMAIN` | No | *(empty)* | If unset, the Ubuntu script auto-detects the server's IP and uses it for `server_name`/CORS/origin |
| `API_PORT` | No | `5001` | Port the Express process listens on internally |
| `DB_NAME` / `DB_USER` | No | `helpdesky` / `helpdesky_user` | PostgreSQL database/role names |
| `SEED_ADMIN_USERNAME` | No | `admin` | One-time admin account created by `init_db.js` |
| `SEED_ADMIN_PASSWORD` | No | *(unset — no seed admin created)* | Set this to get a login on first deploy |
| `SEED_ADMIN_NAME` | No | `System Admin` | Display name for the seeded admin |
| `ENABLE_TLS` | No | `false` | Requests a Let's Encrypt cert via certbot when `true` (requires `DOMAIN`) |
| `LETSENCRYPT_EMAIL` | No | — | Required when `ENABLE_TLS=true` |
| `NODE_MAJOR` *(Ubuntu only)* | No | `20` | NodeSource major version to install |

## 5. Deploying on Ubuntu/Debian

```bash
sudo REPO_URL="https://github.com/francismudzungayiri/HelpDesk-v3.git" \
     DB_PASSWORD="pick-a-strong-db-password" \
     JWT_SECRET="$(openssl rand -hex 32)" \
     SEED_ADMIN_PASSWORD="pick-a-strong-admin-password" \
     bash deploy-ubuntu.sh
```

At the end the script prints the URL to visit (`http://<server-ip>` if no
`DOMAIN` was set) and the systemd/nginx status commands to check.

Log in with `SEED_ADMIN_USERNAME` (default `admin`) and the
`SEED_ADMIN_PASSWORD` you supplied.

### Adding a domain + TLS later

Once DNS for your domain points at the server:

```bash
sudo REPO_URL="https://github.com/francismudzungayiri/HelpDesk-v3.git" \
     DB_PASSWORD="same-db-password-as-before" \
     JWT_SECRET="same-jwt-secret-as-before" \
     DOMAIN="helpdesk.example.com" \
     ENABLE_TLS=true \
     LETSENCRYPT_EMAIL="you@example.com" \
     bash deploy-ubuntu.sh
```

Re-running with the *same* `DB_PASSWORD`/`JWT_SECRET` is safe — the script
skips creating the DB role/database if they already exist, and simply
rewrites the env files, nginx config, and service unit.

## 6. Deploying on openSUSE Leap / SLES

```bash
sudo REPO_URL="https://github.com/francismudzungayiri/HelpDesk-v3.git" \
     DOMAIN="helpdesk.example.com" \
     DB_PASSWORD="strong-db-password" \
     JWT_SECRET="very-long-random-secret" \
     SEED_ADMIN_PASSWORD="change-me-now" \
     bash deploy.sh
```

Same variables and behavior as the Ubuntu script, aside from using `zypper`
for packages, `firewalld` for the firewall, and
`/etc/nginx/vhosts.d/` for the site config.

## 7. Updating an Existing Deployment

After pushing new commits to `main` (or your chosen `BRANCH`), run on the
server:

```bash
sudo bash update.sh
```

This pulls the latest code, runs `npm ci` for both `server` and `client`,
applies DB migrations (`npm run db:migrate`), rebuilds the frontend, then
restarts the API service and reloads nginx.

Override defaults if your install isn't in the standard location:

```bash
APP_DIR=/opt/helpdesky/app APP_NAME=helpdesky BRANCH=main sudo bash update.sh
```

## 8. Operating the Deployment

```bash
# Status
sudo systemctl status helpdesky-api.service nginx postgresql --no-pager

# Logs (API)
sudo journalctl -u helpdesky-api.service -f

# Restart just the API
sudo systemctl restart helpdesky-api.service

# nginx config test + reload after manual edits
sudo nginx -t && sudo systemctl reload nginx
```

Create additional staff accounts (agents/admins) after deploy:

```bash
cd /opt/helpdesky/app/server
node create_user.js <username> <password> <role> "<full name>"
# <role> is ADMIN or AGENT
```

## 9. Troubleshooting

<a id="troubleshooting"></a>

**"`npm ci` requires package-lock.json" errors**
The repo has no lockfile at its root — only inside `client/` and `server/`.
Both deploy scripts already account for this by using
`npm --prefix <dir> ci` rather than `cd <dir> && npm ci` from the repo root,
which correctly resolves the lockfile inside `<dir>` regardless of the
working directory. If you see this error, check:
- That `$APP_DIR` actually points at the repo root (i.e. `client/` and
  `server/` are direct children) and cloning didn't nest an extra directory
  level.
- That you're running the provided script rather than a hand-rolled
  `npm ci` at the repo root.

**nginx fails to start / `nginx -t` errors**
Usually a duplicate `server_name`/port conflict with the distro's default
site. The Ubuntu script removes `/etc/nginx/sites-enabled/default`
automatically; if you added other sites manually, check for conflicts with
`sudo nginx -T | less`.

**API service won't start**
Check `sudo journalctl -u helpdesky-api.service -e` — the most common causes
are a missing/incorrect `server/.env` (script writes this automatically) or
PostgreSQL not yet accepting connections (`sudo systemctl status postgresql`).

**Realtime/event stream drops after ~1 minute**
The SSE endpoint (`/api/events`) sends a heartbeat every 25s, which is well
under nginx's default 60s `proxy_read_timeout`, so this shouldn't happen with
the provided nginx config. If you've customized the config, don't reduce
`proxy_read_timeout` below ~30s on that location.

**Locked out after rotating `JWT_SECRET`**
Expected — all previously issued tokens become invalid. Users just need to
log in again.

## 10. Security Notes

- `server/.env` is written with `chmod 600` — keep it that way; it holds the
  DB password and JWT secret.
- Generate `JWT_SECRET` with something like `openssl rand -hex 32` — don't
  reuse a short or guessable value.
- If you enable TLS later, certbot's nginx plugin adds the redirect from
  HTTP to HTTPS automatically (`--redirect` flag).
