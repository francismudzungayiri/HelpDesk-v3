const pool = require('./db');
const { publish } = require('./realtime');

const PREVIEW_LENGTH = 140;

const preview = (text) => {
  const flattened = String(text || '').replace(/\s+/g, ' ').trim();
  return flattened.length > PREVIEW_LENGTH ? `${flattened.slice(0, PREVIEW_LENGTH - 1).trimEnd()}…` : flattened;
};

// The session token only carries the username, so the display name comes from the database.
const getDisplayName = async (userId) => {
  const result = await pool.query('SELECT name, username FROM users WHERE id = $1', [userId]);
  const user = result.rows[0];
  return user ? user.name || user.username : 'Someone';
};

// Stores one notification per recipient and pushes it to their open clients. Nobody is notified
// of their own action. The ticket change has already been saved by the time this runs, so a
// failure here is logged and never fails the request.
const notifyUsers = async ({ userIds, actorId, ticketId, type, title, body }) => {
  const recipients = [...new Set(userIds.filter(Boolean).map(Number))].filter((id) => id !== Number(actorId));
  if (recipients.length === 0) return;

  const result = await pool.query(
    `
    INSERT INTO notifications (user_id, ticket_id, type, title, body)
    SELECT recipient, $2, $3, $4, $5
    FROM UNNEST($1::integer[]) AS recipient
    RETURNING id, user_id, ticket_id, type, title, body, read_at, created_at
  `,
    [recipients, ticketId, type, title, preview(body)]
  );

  for (const notification of result.rows) {
    publish('notification.created', notification, (user) => Number(user.id) === notification.user_id);
  }
};

const logFailure = (err) => console.error('Create notification failed:', err);

// Unassigned tickets go to whoever can pick them up. Admins always hear about them, otherwise
// a ticket could go unnoticed while every agent is away.
const getAvailableStaffIds = async () => {
  const staff = await pool.query(
    "SELECT id FROM users WHERE role = 'ADMIN' OR (role = 'AGENT' AND work_status = 'AVAILABLE')"
  );
  return staff.rows.map((row) => row.id);
};

const notifyTicketCreated = async ({ ticketId, actorId, callerName, description }) => {
  try {
    await notifyUsers({
      userIds: await getAvailableStaffIds(),
      actorId,
      ticketId,
      type: 'TICKET_CREATED',
      title: `New ticket #${ticketId} from ${callerName}`,
      body: description
    });
  } catch (err) {
    logFailure(err);
  }
};

const notifyTicketAssigned = async ({ ticketId, actorId, assigneeId }) => {
  try {
    if (!assigneeId || Number(assigneeId) === Number(actorId)) return;

    const actorName = await getDisplayName(actorId);
    await notifyUsers({
      userIds: [assigneeId],
      actorId,
      ticketId,
      type: 'TICKET_ASSIGNED',
      title: `${actorName} assigned ticket #${ticketId} to you`,
      body: ''
    });
  } catch (err) {
    logFailure(err);
  }
};

// Comments reach the person who opened the ticket and the agent working on it. With no agent
// on it yet, they go to the staff who could pick it up instead.
const notifyCommentAdded = async ({ ticket, ticketId, actorId, comment }) => {
  try {
    const staffIds = ticket.assignee_id ? [ticket.assignee_id] : await getAvailableStaffIds();
    const userIds = [ticket.created_by, ...staffIds];
    const actorName = await getDisplayName(actorId);

    await notifyUsers({
      userIds,
      actorId,
      ticketId,
      type: 'COMMENT_ADDED',
      title: `${actorName} commented on ticket #${ticketId}`,
      body: comment
    });
  } catch (err) {
    logFailure(err);
  }
};

module.exports = {
  notifyTicketCreated,
  notifyTicketAssigned,
  notifyCommentAdded
};
