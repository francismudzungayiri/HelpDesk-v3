import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiAlertCircle, FiArrowLeft } from 'react-icons/fi';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import useTicketEvents from '../hooks/useTicketEvents';
import { getStatusPhrase, getTicketArea, getTicketTitle, relativeTime } from '../utils/ticketStatus';

const firstName = (name) => (name ? String(name).trim().split(/\s+/)[0] : 'IT');
const isRealValue = (value) => value !== null && value !== undefined && value !== '' && value !== 'null';

const formatWhen = (date) => new Date(date).toLocaleString(undefined, {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit'
});

const formatFieldValue = (value) => {
  if (!isRealValue(value)) return 'Not given';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

const describeHistory = (entry) => {
  const actor = firstName(entry.user_name);

  if (entry.action === 'ASSIGNEE_CHANGE') {
    if (!isRealValue(entry.new_name)) return { tone: 'open', text: 'Back in the queue for IT to pick up' };
    if (isRealValue(entry.old_name)) return { tone: 'open', text: `Handed over to ${firstName(entry.new_name)}` };
    return { tone: 'open', text: `${firstName(entry.new_name)} picked this up` };
  }

  if (entry.action === 'STATUS_CHANGE') {
    if (entry.new_value === 'IN_PROGRESS') return { tone: 'progress', text: `${actor} started work on it` };
    if (entry.new_value === 'RESOLVED') return { tone: 'resolved', text: `${actor} marked it as fixed` };
    if (entry.new_value === 'OPEN') return { tone: 'open', text: `${actor} reopened it` };
  }

  return null;
};

// Events logged in the same second keep a natural order: picked up before started, before replies.
const EVENT_RANK = { reported: 0, ASSIGNEE_CHANGE: 1, STATUS_CHANGE: 2, message: 3 };

const buildTimeline = (ticket, history, comments, userId) => {
  const events = [{ key: 'reported', kind: 'event', rank: EVENT_RANK.reported, tone: 'open', at: ticket.created_at, text: 'You reported this' }];

  history.forEach((entry) => {
    const described = describeHistory(entry);
    if (described) {
      events.push({ key: `h-${entry.id}`, kind: 'event', rank: EVENT_RANK[entry.action], at: entry.created_at, ...described });
    }
  });

  comments.forEach((comment) => {
    const mine = Number(comment.user_id) === Number(userId);
    events.push({
      key: `c-${comment.id}`,
      kind: 'message',
      rank: EVENT_RANK.message,
      at: comment.created_at,
      mine,
      author: mine ? 'You' : `${comment.user_name || 'IT'}${comment.user_role !== 'END_USER' ? ' · IT' : ''}`,
      text: comment.comment
    });
  });

  const second = (date) => Math.floor(new Date(date).getTime() / 1000);
  return events.sort((a, b) => (second(a.at) - second(b.at)) || (a.rank - b.rank));
};

const EndUserTicket = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [history, setHistory] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async ({ background = false } = {}) => {
    if (!background) {
      setLoading(true);
      setLoadError('');
    }

    try {
      const [ticketRes, historyRes, commentsRes] = await Promise.all([
        api.get(`/tickets/${id}`),
        api.get(`/tickets/${id}/history`).catch(() => ({ data: [] })),
        api.get(`/tickets/${id}/comments`).catch(() => ({ data: [] }))
      ]);
      if (!mountedRef.current) return;
      setTicket(ticketRes.data);
      setHistory(historyRes.data);
      setComments(commentsRes.data);
    } catch (err) {
      console.error('Error fetching ticket:', err);
      if (!background && mountedRef.current) {
        const status = err.response?.status;
        setLoadError(status === 404 || status === 403
          ? "We couldn't find that ticket. It may belong to someone else."
          : "We couldn't load this ticket. Check your connection and try again.");
      }
    } finally {
      if (!background && mountedRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useTicketEvents(({ payload }) => {
    const changedId = Number(payload?.ticket_id);
    if (Number.isFinite(changedId) && changedId !== Number(id)) return;
    fetchData({ background: true });
  }, Boolean(id));

  const handleSend = async (event) => {
    event.preventDefault();
    if (!message.trim()) {
      setSendError('Write a message first.');
      return;
    }

    setSending(true);
    setSendError('');
    try {
      await api.post(`/tickets/${id}/comments`, { comment: message.trim() });
      setMessage('');
      await fetchData({ background: true });
    } catch (err) {
      const messages = err.response?.data?.errors || [err.response?.data?.message || "Your message didn't send. Try again."];
      setSendError(messages.join(' '));
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  const backLink = (
    <Link to="/portal" className="back-link">
      <FiArrowLeft size={16} aria-hidden="true" />
      Your tickets
    </Link>
  );

  if (loading) {
    return (
      <div className="portal-page">
        {backLink}
        <div className="ticket-loading" aria-live="polite">
          <span className="skeleton-block" style={{ width: '120px' }} />
          <span className="skeleton-block skeleton-title" />
          <span className="skeleton-block skeleton-band" />
        </div>
      </div>
    );
  }

  if (loadError || !ticket) {
    return (
      <div className="portal-page">
        {backLink}
        <div className="form-alert" role="alert">
          <FiAlertCircle size={18} aria-hidden="true" />
          <div>
            <p>{loadError || "We couldn't load this ticket."}</p>
            <button type="button" className="btn-secondary" onClick={() => fetchData()}>Try again</button>
          </div>
        </div>
      </div>
    );
  }

  const status = getStatusPhrase(ticket);
  const area = getTicketArea(ticket);
  const timeline = buildTimeline(ticket, history, comments, user?.id);
  const isFixed = ticket.status === 'RESOLVED';

  return (
    <div className="portal-page ticket-page">
      {backLink}

      <header className="ticket-head">
        <h1>{getTicketTitle(ticket.description, 120)}</h1>
        <p className="ticket-meta">
          <span className="ticket-num">#{ticket.id}</span>
          {' · '}
          {[`Reported ${relativeTime(ticket.created_at)}`, area].filter(Boolean).join(' · ')}
        </p>
      </header>

      <section className={`status-band tone-${status.tone}`} aria-live="polite">
        <p className="status-band-phrase">{status.phrase}</p>
        <p className="status-band-detail">{status.detail}</p>
        {isFixed && ticket.resolution_note && (
          <p className="status-band-note">
            <strong>What IT did:</strong> {ticket.resolution_note}
          </p>
        )}
      </section>

      <section className="ticket-section" aria-labelledby="told-heading">
        <h2 id="told-heading">What you reported</h2>
        <p className="ticket-description">{ticket.description}</p>
        {ticket.custom_fields?.length > 0 && (
          <dl className="ticket-facts">
            {ticket.custom_fields.map((field) => (
              <div key={field.field_definition_id}>
                <dt>{field.label}</dt>
                <dd>{formatFieldValue(field.value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="ticket-section" aria-labelledby="timeline-heading">
        <h2 id="timeline-heading">What's happened</h2>
        <ol className="timeline">
          {timeline.map((item) => (
            item.kind === 'message' ? (
              <li key={item.key} className={`timeline-item timeline-message${item.mine ? ' is-mine' : ''}`}>
                <div className="timeline-bubble">
                  <p className="timeline-author">
                    {item.author}
                    <time dateTime={item.at}>{formatWhen(item.at)}</time>
                  </p>
                  <p className="timeline-text">{item.text}</p>
                </div>
              </li>
            ) : (
              <li key={item.key} className={`timeline-item timeline-event tone-${item.tone}`}>
                <span className="timeline-dot" aria-hidden="true" />
                <p>
                  {item.text}
                  <time dateTime={item.at}>{formatWhen(item.at)}</time>
                </p>
              </li>
            )
          ))}
        </ol>

        <form className="reply-form" onSubmit={handleSend} noValidate>
          <label htmlFor="reply-message">
            {isFixed ? 'Still happening? Tell IT here' : 'Add a message for IT'}
          </label>
          <textarea
            id="reply-message"
            rows={3}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              if (sendError) setSendError('');
            }}
            placeholder={isFixed ? 'Describe what is still wrong.' : 'Anything new, or something IT should know.'}
            aria-invalid={sendError ? true : undefined}
            aria-describedby={sendError ? 'reply-error' : undefined}
          />
          {sendError && (
            <p className="field-error" id="reply-error">
              <FiAlertCircle size={14} aria-hidden="true" />
              {sendError}
            </p>
          )}
          <div className="reply-actions">
            <button type="submit" className="btn" disabled={sending}>
              {sending ? 'Sending…' : 'Send message'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default EndUserTicket;
