const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// An idle client dropping (Postgres restart, network blip) is recoverable: the
// pool discards that client and dials a new one on the next query. Exiting here
// turned a transient fault into a full API outage.
pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
});

module.exports = pool;
