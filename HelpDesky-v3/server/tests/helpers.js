process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-not-used-anywhere-real';
process.env.SEED_ADMIN_USERNAME = 'admin';
process.env.TRUST_PROXY = '0';

const jwt = require('jsonwebtoken');

// Mirrors the payload routes actually sign in routes/auth.js.
const tokenFor = ({ id, username, role }) =>
  jwt.sign({ id, username, role }, process.env.JWT_SECRET, { expiresIn: '1h' });

const ADMIN = { id: 1, username: 'admin', role: 'ADMIN' };
const OTHER_ADMIN = { id: 2, username: 'second.admin', role: 'ADMIN' };
const AGENT = { id: 3, username: 'agent.one', role: 'AGENT' };
const END_USER = { id: 4, username: 'end.user', role: 'END_USER' };
const OTHER_END_USER = { id: 5, username: 'other.user', role: 'END_USER' };

const auth = (user) => ['Authorization', `Bearer ${tokenFor(user)}`];

module.exports = { tokenFor, auth, ADMIN, OTHER_ADMIN, AGENT, END_USER, OTHER_END_USER };
