const { auth, ADMIN, AGENT, END_USER, OTHER_END_USER } = require('./helpers');

jest.mock('../db', () => require('./dbMock').pool);

const request = require('supertest');
const { setHandlers, reset, rows } = require('./dbMock');
const app = require('../app');

// Ticket 100 belongs to END_USER. OTHER_END_USER must never see it.
const OWNED_TICKET = { id: 100, created_by: END_USER.id };

const ticketDetailRow = {
  ...OWNED_TICKET,
  caller_name: 'End User',
  department: 'Finance',
  description: 'Printer is on fire',
  priority: 'HIGH',
  status: 'OPEN',
  category_id: null,
  subcategory_id: null
};

const baseHandlers = () => [
  { match: 'SELECT id, created_by FROM tickets WHERE id', result: rows([OWNED_TICKET]) },
  { match: 'FROM ticket_notes n', result: rows([{ id: 1, note: 'Internal: caller is a VIP, escalate quietly', user_name: 'Agent One' }]) },
  { match: 'FROM ticket_comments c', result: rows([{ id: 1, comment: 'We are looking into it', user_name: 'Agent One' }]) },
  { match: 'FROM ticket_history h', result: rows([]) },
  { match: 'INSERT INTO ticket_notes', result: rows([{ id: 2, note: 'note', ticket_id: 100 }]) },
  { match: 'INSERT INTO ticket_comments', result: rows([{ id: 2, comment: 'comment', ticket_id: 100 }]) },
  { match: 'FROM tickets t', result: rows([ticketDetailRow]) }
];

beforeEach(() => {
  reset();
  setHandlers(baseHandlers());
});

describe('GET /api/tickets/:id/notes - internal notes are staff-only', () => {
  test('the ticket owner cannot read internal notes on their own ticket', async () => {
    const res = await request(app)
      .get('/api/tickets/100/notes')
      .set(...auth(END_USER));

    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toContain('escalate quietly');
  });

  test('an unrelated end user cannot read internal notes either', async () => {
    const res = await request(app)
      .get('/api/tickets/100/notes')
      .set(...auth(OTHER_END_USER));

    expect(res.status).toBe(403);
  });

  test('agents can read internal notes', async () => {
    const res = await request(app)
      .get('/api/tickets/100/notes')
      .set(...auth(AGENT));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('admins can read internal notes', async () => {
    const res = await request(app)
      .get('/api/tickets/100/notes')
      .set(...auth(ADMIN));

    expect(res.status).toBe(200);
  });
});

describe('POST /api/tickets/:id/notes - end users cannot write internal notes', () => {
  test('end user is rejected', async () => {
    const res = await request(app)
      .post('/api/tickets/100/notes')
      .set(...auth(END_USER))
      .send({ note: 'sneaking into the work log' });

    expect(res.status).toBe(403);
  });

  test('agent is accepted', async () => {
    const res = await request(app)
      .post('/api/tickets/100/notes')
      .set(...auth(AGENT))
      .send({ note: 'Replaced the toner' });

    expect(res.status).toBe(201);
  });
});

describe('shared comments stay visible to the ticket owner', () => {
  test('owner can read comments on their own ticket', async () => {
    const res = await request(app)
      .get('/api/tickets/100/comments')
      .set(...auth(END_USER));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('a different end user cannot read comments on someone else ticket', async () => {
    const res = await request(app)
      .get('/api/tickets/100/comments')
      .set(...auth(OTHER_END_USER));

    expect(res.status).toBe(403);
  });

  test('owner can post a comment', async () => {
    const res = await request(app)
      .post('/api/tickets/100/comments')
      .set(...auth(END_USER))
      .send({ comment: 'Any update on this?' });

    expect(res.status).toBe(201);
  });

  test('a different end user cannot post a comment', async () => {
    const res = await request(app)
      .post('/api/tickets/100/comments')
      .set(...auth(OTHER_END_USER))
      .send({ comment: 'let me in' });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/tickets/:id and history respect ownership', () => {
  test('owner can read their own ticket', async () => {
    const res = await request(app)
      .get('/api/tickets/100')
      .set(...auth(END_USER));

    expect(res.status).toBe(200);
  });

  test('a different end user cannot read it', async () => {
    const res = await request(app)
      .get('/api/tickets/100')
      .set(...auth(OTHER_END_USER));

    expect(res.status).toBe(403);
  });

  test('a different end user cannot read its history', async () => {
    const res = await request(app)
      .get('/api/tickets/100/history')
      .set(...auth(OTHER_END_USER));

    expect(res.status).toBe(403);
  });

  test('staff can read any ticket', async () => {
    const res = await request(app)
      .get('/api/tickets/100')
      .set(...auth(AGENT));

    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/tickets/:id - only staff may update tickets', () => {
  test('end users cannot update even their own ticket', async () => {
    const res = await request(app)
      .patch('/api/tickets/100')
      .set(...auth(END_USER))
      .send({ status: 'RESOLVED' });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/tickets - end users are scoped to their own tickets', () => {
  test('the created_by filter is bound to the caller id', async () => {
    let capturedParams = null;

    setHandlers([
      {
        match: 'FROM tickets t',
        result: (params) => {
          capturedParams = params;
          return rows([]);
        }
      }
    ]);

    const res = await request(app)
      .get('/api/tickets')
      .set(...auth(END_USER));

    expect(res.status).toBe(200);
    // The route must narrow to the caller, not trust a client-supplied filter.
    expect(capturedParams).toContain(END_USER.id);
  });

  test('an end user cannot widen scope via query params', async () => {
    let capturedSql = null;

    setHandlers([
      {
        match: 'FROM tickets t',
        result: (params, sql) => {
          capturedSql = sql;
          return rows([]);
        }
      }
    ]);

    await request(app)
      .get('/api/tickets?assignee_id=3')
      .set(...auth(END_USER));

    expect(capturedSql).toContain('t.created_by =');
  });
});
