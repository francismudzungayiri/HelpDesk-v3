const pool = require('./db');
const bcrypt = require('bcrypt');

const [,, username, password] = process.argv;

if (!username || !password) {
  console.log('Usage: node reset_password.js <username> <new password>');
  process.exit(1);
}

async function resetPassword() {
  try {
    const hash = await bcrypt.hash(password, 10);
    const res = await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2 RETURNING id, username, role',
      [hash, username]
    );
    if (res.rowCount === 0) {
      console.error('Error: No user found with that username.');
    } else {
      console.log('Password reset successfully:', res.rows[0]);
    }
  } catch (err) {
    console.error('Error resetting password:', err.message);
  } finally {
    pool.end();
  }
}

resetPassword();
