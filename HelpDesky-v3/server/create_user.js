const pool = require('./db');
const bcrypt = require('bcrypt');

const [,, username, password, role, ...nameParts] = process.argv;
const name = nameParts.join(' ');

if (!username || !password || !role || !name) {
  console.log('Usage: node create_user.js <username> <password> <role> <name>');
  console.log('Roles: ADMIN, AGENT');
  process.exit(1);
}

if (!['ADMIN', 'AGENT'].includes(role)) {
  console.log('Error: Role must be ADMIN or AGENT');
  process.exit(1);
}

async function createUser() {
  try {
    const hash = await bcrypt.hash(password, 10);
    const res = await pool.query(
      'INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4) RETURNING id, username, role',
      [username, hash, role, name]
    );
    console.log('User created successfully:', res.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      console.error('Error: Username already exists.');
    } else {
      console.error('Error creating user:', err.message);
    }
  } finally {
    pool.end();
  }
}

createUser();
