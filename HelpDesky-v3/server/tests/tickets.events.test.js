const { auth, AGENT, END_USER, OTHER_END_USER } = require('./helpers');

jest.mock('../db', () => require('./dbMock').pool);
jest.mock('../realtime', () => ({
  publish: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  writeEvent: jest.fn()
}));

const request = require('supertest');
const { setHandlers, reset, rows } = require('./dbMock');
const { publish } = require('../realtime');
const app = require('../app');

// Ticket 100 is owned by END_USER.
const OWNED_TICKET = { id: 100, created_by: END_USER.id };

const STAFF = { id: 9, username: 'staff.member', role: 'AGENT' };

beforeEach(() => {
  reset();
  publish.mockClear();
  setHandlers([
    { match: 'SELECT id, created_by FROM tickets WHERE id', result: rows([OWNED_TICKET]) },
    { match: 'SELECT status, assignee_id, created_by FROM tickets WHERE id', result: rows([{ status: 'OPEN', assignee_id: null, created_by: END_USER.id }]) },
    { match: 'INSERT INTO ticket_notes', result: rows([{ id: 2, ticket_id: 100, note: 'note' }]) },
    { match: 'INSERT INTO ticket_comments', result: rows([{ id: 2, ticket_id: 100, comment: 'comment' }]) },
    { match: 'INSERT INTO ticket_history', result: rows([]) },
    { match: 'UPDATE tickets SET', result: rows([]) }
  ]);
});

// The third argument to publish() is the audience filter. These tests exercise
// the filter the route actually supplied, rather than re-testing publish itself.
const audienceFilter = () => {
  expect(publish).toHaveBeenCalledTimes(1);
  const filter = publish.mock.calls[0][2];
  expect(typeof filter).toBe('function');
  return filter;
};

describe('note events are addressed to staff only', () => {
  test('adding an internal note publishes with a staff-only audience', async () => {
    const res = await request(app)
      .post('/api/tickets/100/notes')
      .set(...auth(AGENT))
      .send({ note: 'Caller is a VIP' });

    expect(res.status).toBe(201);

    const filter = audienceFilter();
    expect(filter(STAFF)).toBe(true);
    // Not even the ticket owner may be told an internal note exists.
    expect(filter(END_USER)).toBe(false);
    expect(filter(OTHER_END_USER)).toBe(false);
  });
});

describe('ticket events are addressed to staff and the ticket owner', () => {
  test('a comment publishes to staff and the owner only', async () => {
    const res = await request(app)
      .post('/api/tickets/100/comments')
      .set(...auth(AGENT))
      .send({ comment: 'Engineer dispatched' });

    expect(res.status).toBe(201);

    const filter = audienceFilter();
    expect(filter(STAFF)).toBe(true);
    expect(filter(END_USER)).toBe(true);
    expect(filter(OTHER_END_USER)).toBe(false);
  });

  test('a ticket update publishes to staff and the owner only', async () => {
    const res = await request(app)
      .patch('/api/tickets/100')
      .set(...auth(AGENT))
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);

    const filter = audienceFilter();
    expect(filter(STAFF)).toBe(true);
    expect(filter(END_USER)).toBe(true);
    expect(filter(OTHER_END_USER)).toBe(false);
  });
});
