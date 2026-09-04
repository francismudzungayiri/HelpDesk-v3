const { subscribe, unsubscribe, publish } = require('../realtime');

// Stand-in for the SSE response object: records everything written to it.
const fakeRes = () => {
  const written = [];
  return { written, write: (chunk) => written.push(chunk) };
};

const connect = (user) => {
  const res = fakeRes();
  const id = subscribe({ res, user });
  return { id, res };
};

const ADMIN = { id: 1, username: 'admin', role: 'ADMIN' };
const AGENT = { id: 3, username: 'agent.one', role: 'AGENT' };
const OWNER = { id: 4, username: 'end.user', role: 'END_USER' };
const BYSTANDER = { id: 5, username: 'other.user', role: 'END_USER' };

describe('publish() audience filtering', () => {
  let clients;

  beforeEach(() => {
    clients = {
      admin: connect(ADMIN),
      agent: connect(AGENT),
      owner: connect(OWNER),
      bystander: connect(BYSTANDER)
    };
  });

  afterEach(() => {
    Object.values(clients).forEach((c) => unsubscribe(c.id));
  });

  test('with no filter every subscriber receives the event', () => {
    publish('ticket.created', { ticket_id: 1 });

    Object.values(clients).forEach((c) => {
      expect(c.res.written.join('')).toContain('ticket.created');
    });
  });

  test('staff-only events never reach end users', () => {
    const staffOnly = (user) => user.role !== 'END_USER';

    publish('ticket.note_added', { ticket_id: 1 }, staffOnly);

    expect(clients.admin.res.written.join('')).toContain('ticket.note_added');
    expect(clients.agent.res.written.join('')).toContain('ticket.note_added');
    expect(clients.owner.res.written.join('')).toBe('');
    expect(clients.bystander.res.written.join('')).toBe('');
  });

  test('owner-scoped events reach staff and the owner but not other end users', () => {
    const staffOrTicketOwner = (ownerId) => (user) =>
      user.role !== 'END_USER' || Number(user.id) === Number(ownerId);

    publish('ticket.updated', { ticket_id: 100 }, staffOrTicketOwner(OWNER.id));

    expect(clients.admin.res.written.join('')).toContain('ticket.updated');
    expect(clients.agent.res.written.join('')).toContain('ticket.updated');
    expect(clients.owner.res.written.join('')).toContain('ticket.updated');
    expect(clients.bystander.res.written.join('')).toBe('');
  });

  test('unsubscribed clients stop receiving events', () => {
    unsubscribe(clients.agent.id);

    publish('ticket.created', { ticket_id: 1 });

    expect(clients.agent.res.written.join('')).toBe('');
    expect(clients.admin.res.written.join('')).toContain('ticket.created');
  });

  test('a client whose socket throws is dropped rather than breaking the fan-out', () => {
    const broken = { write: () => { throw new Error('EPIPE'); }, };
    const brokenId = subscribe({ res: broken, user: AGENT });

    expect(() => publish('ticket.created', { ticket_id: 1 })).not.toThrow();
    expect(clients.admin.res.written.join('')).toContain('ticket.created');

    unsubscribe(brokenId);
  });

  test('event payloads are serialized as well-formed SSE frames', () => {
    publish('ticket.created', { ticket_id: 42 });

    const frame = clients.admin.res.written.join('');
    expect(frame).toBe('event: ticket.created\ndata: {"ticket_id":42}\n\n');
  });
});
