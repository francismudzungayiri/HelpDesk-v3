# HelpDesky v3

Internal IT help desk system for ticket intake, assignment, and resolution tracking.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- Auth: JWT (role-based)

## Roles
- `ADMIN`: full access (staff management, reports, dashboard)
- `AGENT`: ticket operations
- `END_USER`: submit and track own tickets only

## Project Structure
- `client/` - React app
- `server/` - Express API + DB scripts

## Prerequisites
- Node.js 18+
- PostgreSQL 13+

## Backend Setup
1. Install dependencies:
```bash
cd server
npm install
```

2. Create env file (`server/.env`):
```env
PORT=5001
JWT_SECRET=replace-with-strong-secret
DB_HOST=localhost
DB_PORT=5432
DB_NAME=helpdesky
DB_USERNAME=postgres
DB_PASSWORD=postgres
CORS_ORIGINS=http://localhost:5173

# Reverse proxies in front of the API (nginx on the same host = 1, direct = 0).
# Required for per-client rate limiting to work.
TRUST_PROXY=0

# Optional one-time seed admin on init
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=change-me-now
SEED_ADMIN_NAME=System Admin
```

3. Initialize DB:
```bash
node init_db.js
```

4. Run backend:
```bash
npm run dev
```

## Frontend Setup
1. Install dependencies:
```bash
cd client
npm install
```

2. Optional env (`client/.env`):
```env
VITE_API_URL=http://localhost:5001/api
```

3. Run frontend:
```bash
npm run dev
```

## Initial Access
If you set `SEED_ADMIN_USERNAME` and `SEED_ADMIN_PASSWORD` before running `node init_db.js`, that admin account is created automatically.

If you skip seed values, create staff users with:
```bash
cd server
node create_user.js <username> <password> <role> <full name>
```
`<role>` must be `ADMIN` or `AGENT`.

## Security Notes
- JWT secret is required at startup.
- CORS origins are environment-configurable.
- End users can only access their own tickets.
- Shared ticket comments are visible to all participants on the ticket (admin, agent, end user).
- Internal ticket notes are staff-only, over the API as well as in the UI.
- Only admins can create accounts with the `ADMIN` role or grant it to an existing user.
- Agents cannot modify or delete admin accounts.
- Nobody can change their own role.
- The seed admin account (`SEED_ADMIN_USERNAME`) cannot be deleted or demoted, and only
  that account can change its own password.
- Real-time events are filtered per subscriber: note events go to staff only, ticket
  events go to staff and the ticket owner.
- Set `TRUST_PROXY` to the number of proxies in front of the API, or rate limiting
  will treat all traffic as coming from the proxy.

## Key Features
- Auth and registration
- Ticket creation, assignment, status updates
- Ticket categories and subcategories
- Dynamic custom ticket fields by category/subcategory
- Ticket activity history
- Shared ticket comments (admin/agent/end user)
- Internal notes/work log
- Admin dashboard and reports
- Staff and end-user management (admin)

## Tests
The backend has an access-control suite covering the role boundaries (who may create
or promote admins, who may read internal notes, ticket ownership, event-stream
audiences). It uses a mocked database, so no Postgres instance is needed:
```bash
cd server
npm test
```

## After Pulling Latest Changes
If your database already exists, run:
```bash
cd server
npm run db:migrate
```
This upgrades schema and seeds default ticket categories/subcategories/custom fields.
