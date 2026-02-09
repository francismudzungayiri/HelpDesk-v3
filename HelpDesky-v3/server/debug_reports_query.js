const pool = require('./db');

async function testQueries() {
  console.log('--- Starting Report Queries Debug ---');

  try {
    console.log('1. Testing Status Distribution...');
    const statusRes = await pool.query("SELECT status, COUNT(*) as count FROM tickets GROUP BY status");
    console.log('   Success:', statusRes.rows);
  } catch (err) {
    console.error('   FAILED:', err.message);
  }

  try {
    console.log('2. Testing Priority Distribution...');
    const priorityRes = await pool.query("SELECT priority, COUNT(*) as count FROM tickets GROUP BY priority");
    console.log('   Success:', priorityRes.rows);
  } catch (err) {
    console.error('   FAILED:', err.message);
  }

  try {
    console.log('3. Testing Tickets Over Time...');
    const timeRes = await pool.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count 
      FROM tickets 
      WHERE created_at > NOW() - INTERVAL '30 days' 
      GROUP BY date 
      ORDER BY date
    `);
    console.log('   Success:', timeRes.rows);
  } catch (err) {
    console.error('   FAILED:', err.message);
  }

  try {
    console.log('4. Testing Assignee Performance...');
    const assigneeRes = await pool.query(`
      SELECT u.name, COUNT(t.id) as resolved_count
      FROM users u
      JOIN tickets t ON u.id = t.assignee_id
      WHERE t.status = 'RESOLVED'
      GROUP BY u.name
    `);
    console.log('   Success:', assigneeRes.rows);
  } catch (err) {
    console.error('   FAILED:', err.message);
  }

  pool.end();
}

testQueries();
