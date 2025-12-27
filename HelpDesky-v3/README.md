# HelpDesky v3 (Phase 1 MVP)

A simple, internal IT Help Desk system for tracking phone calls and tickets.
Built for speed, clarity, and ease of use.

## Tech Stack
- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** SQLite (local file)
- **Auth:** Boolean/Role-based with JWT

## Prerequisites
- Node.js (v14+ recommended)
- npm

## Setup & Installation

1. **Clone the repository** (if not already done).

2. **Setup Server**
   ```bash
   cd server
   npm install
   # Initialize Database
   node init_db.js
   ```

3. **Setup Client**
   ```bash
   cd client
   npm install
   ```

## Running the Application

You need to run both the server and client terminals.

**Terminal 1 (Server):**
```bash
cd server
node server.js
# Runs on http://localhost:5001
```

**Terminal 2 (Client):**
```bash
cd client
npm run dev
# Runs on http://localhost:5173 (or similar)
```

## Default Credentials

**Admin User:**
- Username: `admin`
- Password: `password123`

## Features (Phase 1)
- Login (JWT Auth)
- Create Tickets (Caller, Dept, Description, Priority)
- List Tickets (Filter by Status, Priority Colors)
- Ticket Details (Update Status, Assign Staff, Add Resolutions)
- Admin Dashboard (Basic Stats, Workload view)

## Exclusions (Intentional)
- No user accounts for callers (Callers are just text fields).
- No email notifications.
- No history tracking beyond simple "Updated At".
- No complex validation.
