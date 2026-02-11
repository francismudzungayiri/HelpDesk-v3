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
          role VARCHAR(50) NOT NULL CHECK(role IN ('ADMIN', 'AGENT', 'END_USER')),
          department VARCHAR(255),
          phone VARCHAR(255),
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
          created_by INTEGER REFERENCES users(id),
          resolution_note TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          closed_at TIMESTAMP
        )
      `);

      // Ticket Notes Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ticket_notes (
          id SERIAL PRIMARY KEY,
          ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id),
          note TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Ticket History Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ticket_history (
          id SERIAL PRIMARY KEY,
          ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id),
          action TEXT NOT NULL,
          old_value TEXT,
          new_value TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Indexes
      await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets(assignee_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_ticket_notes_ticket_id ON ticket_notes(ticket_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON ticket_history(ticket_id)');

      // Optional admin seed from environment
      const adminUsername = process.env.SEED_ADMIN_USERNAME;
      const adminPassword = process.env.SEED_ADMIN_PASSWORD;
      const adminName = process.env.SEED_ADMIN_NAME || 'System Admin';

      if (adminUsername && adminPassword) {
        const res = await client.query("SELECT id FROM users WHERE username = $1", [adminUsername]);
        
        if (res.rows.length === 0) {
          const hash = await bcrypt.hash(adminPassword, 10);
          await client.query(
            "INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)",
            [adminUsername, hash, 'ADMIN', adminName]
          );
          console.log('Seed admin user created.');
        } else {
          console.log('Seed admin user already exists.');
        }
      } else {
        console.log('Skipping admin seed user. Set SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD to enable.');
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
