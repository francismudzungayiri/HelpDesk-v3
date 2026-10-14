import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import Avatar from '../components/Avatar';
import { timeAgo } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiLock, FiMessageSquare } from 'react-icons/fi';
import LabelField from '../components/LabelField';
import { formatDateTime } from '../utils/formatDate';
import useTicketEvents from '../hooks/useTicketEvents';
import RoutingBlock from '../components/RoutingBlock';
import { Destination, ServiceBand, StatusMark } from '../components/TicketMarks';
import { statusLabel } from '../utils/labels';

const FEED_RANK = { created: 0, ASSIGNEE_CHANGE: 1, STATUS_CHANGE: 2, reply: 3, note: 4 };
const isSet = (value) => value !== null && value !== undefined && value !== '' && value !== 'null';

const describeHistory = (item) => {
  if (item.action === 'STATUS_CHANGE') {
    return `changed status from ${statusLabel(item.old_value)} to ${statusLabel(item.new_value)}`;
  }
  if (item.action === 'ASSIGNEE_CHANGE') {
    if (!isSet(item.new_value)) {
      return isSet(item.old_name) ? `unassigned ${item.old_name}` : 'unassigned the ticket';
    }
    if (item.new_name && item.new_name === item.user_name) return 'took the ticket';
    return `assigned the ticket to ${item.new_name || 'a staff member'}`;
  }
  return null;
};

// One chronological feed: replies the requester sees, staff-only notes and history.
const buildFeed = (ticket, comments, notes, history) => {
  const feed = [{ key: 'created', kind: 'event', rank: FEED_RANK.created, at: ticket.created_at, actor: ticket.caller_name, text: 'reported this ticket' }];

  history.forEach((item) => {
    const text = describeHistory(item);
    if (text) feed.push({ key: `h-${item.id}`, kind: 'event', rank: FEED_RANK[item.action], at: item.created_at, actor: item.user_name, text });
  });
  comments.forEach((comment) => {
    feed.push({
      key: `c-${comment.id}`,
      kind: 'reply',
      rank: FEED_RANK.reply,
      at: comment.created_at,
      author: comment.user_name,
      fromRequester: comment.user_role === 'END_USER',
      text: comment.comment
    });
  });
  notes.forEach((note) => {
    feed.push({ key: `n-${note.id}`, kind: 'note', rank: FEED_RANK.note, at: note.created_at, author: note.user_name, text: note.note });
  });

  const second = (date) => Math.floor(new Date(date).getTime() / 1000);
  return feed.sort((a, b) => (second(a.at) - second(b.at)) || (a.rank - b.rank));
};

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEndUser = user?.role === 'END_USER';

  const [ticket, setTicket] = useState(null);
  const [users, setUsers] = useState([]);
  const [notes, setNotes] = useState([]);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [updating, setUpdating] = useState(false);

  const [status, setStatus] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');

  // Internal note is the default so nothing reaches the requester by accident.
  const [composeMode, setComposeMode] = useState('note');
  const [composeText, setComposeText] = useState('');
  const [composing, setComposing] = useState(false);
  const assignableUsers = users.filter((staffUser) => staffUser.work_status === 'AVAILABLE');

  const fetchData = useCallback(async ({ background = false } = {}) => {
    if (!background) {
      setLoading(true);
      setLoadError('');
    }

    try {
      const ticketRes = await api.get(`/tickets/${id}`);
      setTicket(ticketRes.data);
      // A live update must not wipe edits the agent hasn't saved yet.
      if (!background) {
        setStatus(ticketRes.data.status);
        setAssigneeId(ticketRes.data.assignee_id || '');
        setResolutionNote(ticketRes.data.resolution_note || '');
      }
    } catch (err) {
      console.error('Error fetching ticket detail:', err);
      if (!background) {
        const message = err.response?.data?.message || 'Failed to load ticket details';
        toast.error(message);
        setLoadError(message);
        setTicket(null);
        setUsers([]);
        setNotes([]);
        setComments([]);
        setHistory([]);
        setLoading(false);
      }
      return;
    }

    if (!isEndUser) {
      const [usersRes, notesRes, historyRes, commentsRes] = await Promise.allSettled([
        api.get('/users/staff'),
        api.get(`/tickets/${id}/notes`),
        api.get(`/tickets/${id}/history`),
        api.get(`/tickets/${id}/comments`)
      ]);

      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value.data);
      } else {
        console.error('Error fetching staff users:', usersRes.reason);
        setUsers([]);
      }

      if (notesRes.status === 'fulfilled') {
        setNotes(notesRes.value.data);
      } else {
        console.error('Error fetching ticket notes:', notesRes.reason);
        setNotes([]);
      }

      if (historyRes.status === 'fulfilled') {
        setHistory(historyRes.value.data);
      } else {
        console.error('Error fetching ticket history:', historyRes.reason);
        setHistory([]);
      }

      if (commentsRes.status === 'fulfilled') {
        setComments(commentsRes.value.data);
      } else {
        console.error('Error fetching ticket comments:', commentsRes.reason);
        setComments([]);
      }

      if (!background && [usersRes, notesRes, historyRes, commentsRes].some((result) => result.status === 'rejected')) {
        toast.error('Ticket loaded, but some related details could not be loaded');
      }
    } else {
      setUsers([]);
      setNotes([]);
      setHistory([]);

      try {
        const commentsRes = await api.get(`/tickets/${id}/comments`);
        setComments(commentsRes.data);
      } catch (err) {
        console.error('Error fetching ticket comments:', err);
        setComments([]);
        if (!background) {
          toast.error('Ticket loaded, but comments could not be loaded');
        }
      }
    }

    if (!background) {
      setLoading(false);
    }
  }, [id, isEndUser]);

  useEffect(() => {
    fetchData({ background: false });
  }, [fetchData]);

  useTicketEvents(({ payload }) => {
    if (!id) return;
    const changedTicketId = Number(payload?.ticket_id);
    if (Number.isFinite(changedTicketId) && changedTicketId !== Number(id)) {
      return;
    }
    fetchData({ background: true });
  }, Boolean(id));

  const handleUpdate = async () => {
    if (isEndUser) return;

    setUpdating(true);
    try {
      await api.patch(`/tickets/${id}`, {
        status,
        assignee_id: assigneeId ? parseInt(assigneeId, 10) : null,
        resolution_note: resolutionNote
      });
      toast.success(`Ticket #${id} saved`);
      fetchData({ background: false });
    } catch (err) {
      const messages = err.response?.data?.errors || [err.response?.data?.message || "Couldn't save the ticket. Try again."];
      messages.forEach((msg) => toast.error(msg));
    } finally {
      setUpdating(false);
    }
  };

  const handleCompose = async (e) => {
    e.preventDefault();
    const text = composeText.trim();
    if (!text) return;

    const isNote = composeMode === 'note';
    setComposing(true);
    try {
      if (isNote) {
        await api.post(`/tickets/${id}/notes`, { note: text });
      } else {
        await api.post(`/tickets/${id}/comments`, { comment: text });
      }
      toast.success(isNote ? 'Internal note added' : `Reply sent to ${ticket?.caller_name || 'the requester'}`);
      setComposeText('');
      setComposeMode('note');
      fetchData({ background: true });
    } catch (err) {
      const fallback = isNote ? "Couldn't add the note. Your text is still here; try again." : "Couldn't send the reply. Your text is still here; try again.";
      const messages = err.response?.data?.errors || [err.response?.data?.message || fallback];
      messages.forEach((msg) => toast.error(msg));
    } finally {
      setComposing(false);
    }
  };

  const formatCustomFieldValue = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  const backButton = (
    <button type="button" onClick={() => navigate('/')} className="btn-secondary btn-icon">
      <FiArrowLeft size={15} aria-hidden="true" />
      All tickets
    </button>
  );

  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: '20px' }}>{backButton}</div>
        <div className="card" aria-live="polite">Loading ticket #{id}…</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div>
        <div style={{ marginBottom: '20px' }}>{backButton}</div>
        <div className="card" role="alert">
          <h2 style={{ marginTop: 0 }}>Couldn't open ticket #{id}</h2>
          <p style={{ marginBottom: 0 }}>{loadError || 'It may have been removed, or the link is wrong.'}</p>
        </div>
      </div>
    );
  }

  const callerFirst = (ticket.caller_name || 'the requester').split(' ')[0];
  const feed = buildFeed(ticket, comments, notes, history);
  const savedAssignee = ticket.assignee_id ? String(ticket.assignee_id) : '';
  const hasUnsavedChanges = status !== ticket.status
    || String(assigneeId || '') !== savedAssignee
    || (resolutionNote || '') !== (ticket.resolution_note || '');
  const currentAssigneeMissing = savedAssignee && !assignableUsers.some((u) => String(u.id) === savedAssignee);

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        {backButton}
      </div>

      <div className="ticket-layout">
          <section className="card ticket-details-card" aria-labelledby="ticket-title">
            <header className="ticket-label-head">
              <div className="ticket-label-main">
                <h1 className="ticket-label-title" id="ticket-title">{String(ticket.description || '').trim().split(/\n+/)[0]}</h1>
                <p className="ticket-label-meta">
                  <RoutingBlock ticket={ticket} />
                  {' · '}Reported by {ticket.caller_name} {timeAgo(ticket.created_at)}
                </p>
                <div className="ticket-label-state">
                  <ServiceBand priority={ticket.priority} />
                  <StatusMark status={ticket.status} />
                  <Destination ticket={ticket} />
                </div>
              </div>
            </header>

            <dl className="label-fields">
              <div>
                <dt>Caller</dt>
                <dd>
                  {ticket.caller_name}
                  {ticket.department && <span className="muted"> · {ticket.department}</span>}
                </dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{ticket.phone ? <a href={`tel:${ticket.phone.replace(/\s+/g, '')}`} className="tel-link">{ticket.phone}</a> : <span className="muted">Not given</span>}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>
                  {ticket.category_name
                    ? [ticket.category_name, ticket.category_name !== 'Not sure' ? ticket.subcategory_name : null].filter(Boolean).join(' › ')
                    : <span className="muted">Not categorised</span>}
                </dd>
              </div>
              <div>
                <dt>Reported</dt>
                <dd><time dateTime={ticket.created_at}>{formatDateTime(ticket.created_at)}</time></dd>
              </div>
              <div>
                <dt>Last change</dt>
                <dd><time dateTime={ticket.updated_at || ticket.created_at}>{formatDateTime(ticket.updated_at || ticket.created_at)}</time></dd>
              </div>
              {ticket.custom_fields?.map((field) => (
                <div key={field.field_definition_id}>
                  <dt>{field.label}</dt>
                  <dd>{formatCustomFieldValue(field.value)}</dd>
                </div>
              ))}
            </dl>

            <div className="ticket-problem">
              <h2 className="label-caption">What they reported</h2>
              <p>{ticket.description}</p>
            </div>
          </section>

          <div className="ticket-side">
            <div className="card">
              <h2 className="side-title">Update ticket</h2>

              {!isEndUser && (
                <>
                  <div className="label-grid">
                    <LabelField id="ticket-status" label="Status">
                      <select id="ticket-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In progress</option>
                        <option value="RESOLVED">Resolved</option>
                      </select>
                    </LabelField>
                    <LabelField id="ticket-assignee" label="Routed to" hint="Only staff whose work status is Available are listed.">
                      <select id="ticket-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} aria-describedby="ticket-assignee-hint">
                        <option value="">Unassigned</option>
                        {currentAssigneeMissing && (
                          <option value={savedAssignee}>{ticket.assignee_name} (not available)</option>
                        )}
                        {assignableUsers.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </LabelField>
                    <LabelField id="ticket-resolution" label="How it was fixed" hint={`${callerFirst} sees this once the ticket is resolved.`}>
                      <textarea
                        id="ticket-resolution"
                        aria-describedby="ticket-resolution-hint"
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        rows="4"
                        maxLength={5000}
                        placeholder="e.g. Replaced the toner and cleared the rear tray."
                      />
                    </LabelField>
                  </div>

                  <button onClick={handleUpdate} className="btn side-save" disabled={updating || !hasUnsavedChanges}>
                    {updating ? 'Saving…' : 'Save changes'}
                  </button>
                  <p className="field-hint" aria-live="polite" style={{ textAlign: 'center' }}>
                    {hasUnsavedChanges ? 'You have unsaved changes.' : 'All changes saved.'}
                  </p>
                </>
              )}

              {isEndUser && (
                <div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: 'var(--text-secondary)' }}>Current Status</label>
                    <div style={{ padding: '10px', background: '#f4f5f7', borderRadius: '4px', fontWeight: '500' }}>
                      {statusLabel(status)}
                    </div>
                  </div>
                  {ticket.assignee_name && (
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: 'var(--text-secondary)' }}>Assigned To</label>
                      <div style={{ padding: '10px', background: '#f4f5f7', borderRadius: '4px' }}>
                        {ticket.assignee_name}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <section className="card staff-thread" aria-labelledby="thread-heading">
            <div className="staff-thread-head">
              <h3 id="thread-heading">Conversation and activity</h3>
              <p className="staff-thread-legend">
                <span className="legend-reply">Replies: {callerFirst} sees these</span>
                <span className="legend-note"><FiLock size={12} aria-hidden="true" /> Internal notes: IT staff only</span>
              </p>
            </div>

            <ol className="staff-feed">
              {feed.map((item) => {
                if (item.kind === 'event') {
                  return (
                    <li key={item.key} className="feed-event">
                      <span className="feed-event-dot" aria-hidden="true" />
                      <span className="feed-event-text">
                        {item.actor && <strong>{item.actor}</strong>} {item.text}
                        <time dateTime={item.at} title={new Date(item.at).toLocaleString()}>{timeAgo(item.at)}</time>
                      </span>
                    </li>
                  );
                }

                const isNote = item.kind === 'note';
                return (
                  <li key={item.key} className={`feed-entry ${isNote ? 'feed-note' : 'feed-reply'}`}>
                    <Avatar name={item.author} size={32} />
                    <div className="feed-body">
                      <div className="feed-meta">
                        <strong>{item.author}</strong>
                        <span className="feed-kind">
                          {isNote ? (
                            <><FiLock size={12} aria-hidden="true" /> Internal note</>
                          ) : item.fromRequester ? 'Caller' : `Reply · ${callerFirst} can see this`}
                        </span>
                        <time dateTime={item.at} title={new Date(item.at).toLocaleString()}>{timeAgo(item.at)}</time>
                      </div>
                      <p className="feed-text">{item.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <form className={`composer composer-${composeMode}`} onSubmit={handleCompose}>
              <div className="composer-toggle" role="radiogroup" aria-label="Who should see this message">
                <label className={composeMode === 'note' ? 'is-selected' : ''}>
                  <input
                    type="radio"
                    name="composeMode"
                    value="note"
                    checked={composeMode === 'note'}
                    onChange={() => setComposeMode('note')}
                  />
                  <FiLock size={14} aria-hidden="true" />
                  Internal note
                </label>
                <label className={composeMode === 'reply' ? 'is-selected' : ''}>
                  <input
                    type="radio"
                    name="composeMode"
                    value="reply"
                    checked={composeMode === 'reply'}
                    onChange={() => setComposeMode('reply')}
                  />
                  <FiMessageSquare size={14} aria-hidden="true" />
                  Reply
                </label>
              </div>
              <p className="composer-hint" id="composer-hint">
                {composeMode === 'note'
                  ? 'Only IT staff can see this. Use it for findings, steps tried and handover.'
                  : `${ticket.caller_name || 'The requester'} will see this on their ticket.`}
              </p>
              <label htmlFor="composer-text" className="visually-hidden">
                {composeMode === 'note' ? 'Internal note' : `Reply to ${callerFirst}`}
              </label>
              <textarea
                id="composer-text"
                value={composeText}
                onChange={(e) => setComposeText(e.target.value)}
                rows="3"
                maxLength={5000}
                aria-describedby="composer-hint"
                placeholder={composeMode === 'note' ? 'What did you find or try?' : `Write to ${callerFirst}…`}
              />
              <div className="composer-actions">
                <button type="submit" className="btn" disabled={composing || !composeText.trim()}>
                  {composing
                    ? 'Sending…'
                    : composeMode === 'note' ? 'Add internal note' : `Send reply to ${callerFirst}`}
                </button>
              </div>
            </form>
          </section>

      </div>
    </div>
  );
};

export default TicketDetail;
