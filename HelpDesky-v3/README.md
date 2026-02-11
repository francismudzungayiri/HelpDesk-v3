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
- `/Users/mbuluundi/Documents/vibe-coding/HelpDesky-v3/client` - React app
- `/Users/mbuluundi/Documents/vibe-coding/HelpDesky-v3/server` - Express API + DB scripts

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
- Internal ticket notes are staff-only.

## Key Features
- Auth and registration
- Ticket creation, assignment, status updates
- Ticket activity history
- Internal notes/work log
- Admin dashboard and reports
- Staff and end-user management (admin)
