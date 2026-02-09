const pool = require('./db');
const bcrypt = require('bcrypt');

async function initTables() {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database.');

    try {
      await client.query('BEGIN');

      // Users Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL CHECK(role IN ('ADMIN', 'AGENT')),
          name VARCHAR(255) NOT NULL
        )
      `);

      // Tickets Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS tickets (
          id SERIAL PRIMARY KEY,
          caller_name VARCHAR(255) NOT NULL,
          department VARCHAR(255) NOT NULL,
          phone VARCHAR(255),
          description TEXT NOT NULL,
          priority VARCHAR(50) NOT NULL CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH')),
          status VARCHAR(50) NOT NULL CHECK(status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
          assignee_id INTEGER REFERENCES users(id),
          resolution_note TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          closed_at TIMESTAMP
        )
      `);

      // Seed Admin User
      const adminUsername = 'admin';
      const adminPassword = 'password123';
      const adminRole = 'ADMIN';
      const adminName = 'System Admin';

      const res = await client.query("SELECT id FROM users WHERE username = $1", [adminUsername]);
      
      if (res.rows.length === 0) {
        const hash = await bcrypt.hash(adminPassword, 10);
        await client.query(
          "INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)",
          [adminUsername, hash, adminRole, adminName]
        );
        console.log('Admin user seeded.');
      } else {
        console.log('Admin user already exists.');
      }

      await client.query('COMMIT');
      console.log('Tables initialized successfully.');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    await pool.end();
  }
}

initTables();
