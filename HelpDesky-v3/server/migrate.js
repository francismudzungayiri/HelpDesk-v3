const pool = require('./db');

async function migrate() {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database.');

    try {
      await client.query('BEGIN');

      // Add department and phone columns to users table
      console.log('Adding department and phone columns to users table...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS department VARCHAR(255),
        ADD COLUMN IF NOT EXISTS phone VARCHAR(255)
      `);

      // Drop and recreate the role constraint to include END_USER
      console.log('Updating role constraint to include END_USER...');
      await client.query(`
        ALTER TABLE users 
        DROP CONSTRAINT IF EXISTS users_role_check
      `);
      await client.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_role_check 
        CHECK (role IN ('ADMIN', 'AGENT', 'END_USER'))
      `);

      // Add created_by column to tickets table
      console.log('Adding created_by column to tickets table...');
      await client.query(`
        ALTER TABLE tickets 
        ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)
      `);

      await client.query('COMMIT');
      console.log('Migration completed successfully!');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Migration failed:', e);
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error connecting to database:', err);
  } finally {
    await pool.end();
  }
}

migrate();
