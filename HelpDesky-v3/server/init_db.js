const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('./helpdesk.db', (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to the SQLite database.');
    initTables();
  }
});

function initTables() {
  db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'AGENT')),
      name TEXT NOT NULL
    )`);

    // Tickets Table
    db.run(`CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caller_name TEXT NOT NULL,
      department TEXT NOT NULL,
      phone TEXT,
      description TEXT NOT NULL,
      priority TEXT NOT NULL CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH')),
      status TEXT NOT NULL CHECK(status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
      assignee_id INTEGER,
      resolution_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      FOREIGN KEY (assignee_id) REFERENCES users (id)
    )`);

    // Seed Admin User
    const adminUsername = 'admin';
    const adminPassword = 'password123'; // In production, use strong password
    const adminRole = 'ADMIN';
    const adminName = 'System Admin';

    db.get("SELECT id FROM users WHERE username = ?", [adminUsername], (err, row) => {
      if (err) {
        console.error(err);
        return;
      }
      if (!row) {
        bcrypt.hash(adminPassword, 10, (err, hash) => {
          if (err) {
            console.error(err);
            return;
          }
          db.run("INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)", 
            [adminUsername, hash, adminRole, adminName], 
            (err) => {
              if (err) console.error(err);
              else console.log('Admin user seeded.');
            });
        });
      } else {
        console.log('Admin user already exists.');
      }
    });

  });
}

module.exports = db;
