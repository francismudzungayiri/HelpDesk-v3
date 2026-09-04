const { auth, ADMIN, OTHER_ADMIN, AGENT, END_USER } = require('./helpers');

jest.mock('../db', () => require('./dbMock').pool);

const request = require('supertest');
const { setHandlers, reset, rows } = require('./dbMock');
const app = require('../app');

// Registered on every test so that an *unblocked* request succeeds with 200/201.
// Without these the guarded routes would 500 on a missing handler and the tests
// would pass for the wrong reason.
const userRow = (u) => ({ ...u, name: 'Test User', work_status: 'AVAILABLE' });

const handlersFor = (target) => [
  { match: 'SELECT id, username, role FROM users WHERE id', result: target ? rows([target]) : rows([]) },
  { match: 'SELECT id FROM users WHERE username', result: rows([]) },
  { match: 'UPDATE users SET', result: rows([userRow(target || ADMIN)]) },
  { match: 'INSERT INTO users', result: rows([userRow({ id: 99, username: 'new.user', role: 'AGENT' })]) },
  { match: 'DELETE FROM users WHERE id', result: rows([{ id: target ? target.id : 99 }]) }
];

beforeEach(() => reset());

describe('POST /api/users - who may create which role', () => {
  test('agent cannot create an ADMIN account', async () => {
    setHandlers(handlersFor(null));

    const res = await request(app)
      .post('/api/users')
      .set(...auth(AGENT))
      .send({ username: 'backdoor', password: 'password123', role: 'ADMIN', name: 'Back Door' });

    expect(res.status).toBe(403);
  });

  test('agent may still create an AGENT account', async () => {
    setHandlers(handlersFor(null));

    const res = await request(app)
      .post('/api/users')
      .set(...auth(AGENT))
      .send({ username: 'new.agent', password: 'password123', role: 'AGENT', name: 'New Agent' });

    expect(res.status).toBe(201);
  });

  test('admin may create an ADMIN account', async () => {
    setHandlers(handlersFor(null));

    const res = await request(app)
      .post('/api/users')
      .set(...auth(ADMIN))
      .send({ username: 'new.admin', password: 'password123', role: 'ADMIN', name: 'New Admin' });

    expect(res.status).toBe(201);
  });

  test('nobody may squat the reserved system admin username', async () => {
    setHandlers(handlersFor(null));

    const res = await request(app)
      .post('/api/users')
      .set(...auth(ADMIN))
      .send({ username: 'Admin', password: 'password123', role: 'ADMIN', name: 'Impostor' });

    expect(res.status).toBe(403);
  });

  test('end users cannot reach the route at all', async () => {
    setHandlers(handlersFor(null));

    const res = await request(app)
      .post('/api/users')
      .set(...auth(END_USER))
      .send({ username: 'x.user', password: 'password123', role: 'AGENT', name: 'X User' });

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/users/:id - privilege escalation surface', () => {
  test('agent cannot promote another user to ADMIN', async () => {
    setHandlers(handlersFor({ id: 7, username: 'someone', role: 'AGENT' }));

    const res = await request(app)
      .patch('/api/users/7')
      .set(...auth(AGENT))
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(403);
  });

  test('agent cannot promote themselves to ADMIN', async () => {
    setHandlers(handlersFor({ id: AGENT.id, username: AGENT.username, role: 'AGENT' }));

    const res = await request(app)
      .patch(`/api/users/${AGENT.id}`)
      .set(...auth(AGENT))
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(403);
  });

  test('agent cannot reset an admin password', async () => {
    setHandlers(handlersFor({ id: OTHER_ADMIN.id, username: OTHER_ADMIN.username, role: 'ADMIN' }));

    const res = await request(app)
      .patch(`/api/users/${OTHER_ADMIN.id}`)
      .set(...auth(AGENT))
      .send({ password: 'hijacked-password' });

    expect(res.status).toBe(403);
  });

  test('agent cannot rename an admin account', async () => {
    setHandlers(handlersFor({ id: OTHER_ADMIN.id, username: OTHER_ADMIN.username, role: 'ADMIN' }));

    const res = await request(app)
      .patch(`/api/users/${OTHER_ADMIN.id}`)
      .set(...auth(AGENT))
      .send({ name: 'Renamed By Agent' });

    expect(res.status).toBe(403);
  });

  test('an admin cannot reset the system admin password', async () => {
    setHandlers(handlersFor({ id: ADMIN.id, username: 'admin', role: 'ADMIN' }));

    const res = await request(app)
      .patch(`/api/users/${ADMIN.id}`)
      .set(...auth(OTHER_ADMIN))
      .send({ password: 'taking-over-the-box' });

    expect(res.status).toBe(403);
  });

  test('the system admin may still change their own password', async () => {
    setHandlers(handlersFor({ id: ADMIN.id, username: 'admin', role: 'ADMIN' }));

    const res = await request(app)
      .patch(`/api/users/${ADMIN.id}`)
      .set(...auth(ADMIN))
      .send({ password: 'a-fresh-strong-password' });

    expect(res.status).toBe(200);
  });

  test('the system admin role cannot be demoted', async () => {
    setHandlers(handlersFor({ id: ADMIN.id, username: 'admin', role: 'ADMIN' }));

    const res = await request(app)
      .patch(`/api/users/${ADMIN.id}`)
      .set(...auth(OTHER_ADMIN))
      .send({ role: 'AGENT' });

    expect(res.status).toBe(403);
  });

  test('an admin cannot demote themselves and lock the org out', async () => {
    setHandlers(handlersFor({ id: OTHER_ADMIN.id, username: OTHER_ADMIN.username, role: 'ADMIN' }));

    const res = await request(app)
      .patch(`/api/users/${OTHER_ADMIN.id}`)
      .set(...auth(OTHER_ADMIN))
      .send({ role: 'AGENT' });

    expect(res.status).toBe(403);
  });

  test('agent may still do ordinary agent work: update an end user', async () => {
    setHandlers(handlersFor({ id: END_USER.id, username: END_USER.username, role: 'END_USER' }));

    const res = await request(app)
      .patch(`/api/users/${END_USER.id}`)
      .set(...auth(AGENT))
      .send({ name: 'Corrected Name' });

    expect(res.status).toBe(200);
  });

  test('admin may promote an agent to admin', async () => {
    setHandlers(handlersFor({ id: AGENT.id, username: AGENT.username, role: 'AGENT' }));

    const res = await request(app)
      .patch(`/api/users/${AGENT.id}`)
      .set(...auth(ADMIN))
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(200);
  });

  test('unknown user is a 404, not a silent success', async () => {
    setHandlers(handlersFor(null));

    const res = await request(app)
      .patch('/api/users/4242')
      .set(...auth(ADMIN))
      .send({ name: 'Ghost' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/users/:id - existing guards still hold', () => {
  test('agent cannot delete an admin', async () => {
    setHandlers(handlersFor({ id: OTHER_ADMIN.id, username: OTHER_ADMIN.username, role: 'ADMIN' }));

    const res = await request(app)
      .delete(`/api/users/${OTHER_ADMIN.id}`)
      .set(...auth(AGENT));

    expect(res.status).toBe(403);
  });

  test('the system admin account cannot be deleted', async () => {
    setHandlers(handlersFor({ id: ADMIN.id, username: 'admin', role: 'ADMIN' }));

    const res = await request(app)
      .delete(`/api/users/${ADMIN.id}`)
      .set(...auth(OTHER_ADMIN));

    expect(res.status).toBe(403);
  });

  test('you cannot delete yourself', async () => {
    setHandlers(handlersFor({ id: OTHER_ADMIN.id, username: OTHER_ADMIN.username, role: 'ADMIN' }));

    const res = await request(app)
      .delete(`/api/users/${OTHER_ADMIN.id}`)
      .set(...auth(OTHER_ADMIN));

    expect(res.status).toBe(400);
  });
});

describe('authentication is required', () => {
  test('no token is rejected', async () => {
    setHandlers(handlersFor(null));
    expect((await request(app).get('/api/users')).status).toBe(401);
  });

  test('a token signed with the wrong secret is rejected', async () => {
    setHandlers(handlersFor(null));
    const jwt = require('jsonwebtoken');
    const forged = jwt.sign({ id: 1, username: 'admin', role: 'ADMIN' }, 'wrong-secret');

    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${forged}`);

    expect(res.status).toBe(403);
  });
});
