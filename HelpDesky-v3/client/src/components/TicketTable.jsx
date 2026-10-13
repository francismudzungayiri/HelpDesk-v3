import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { timeAgo } from '../utils/dateUtils';
import RoutingBlock from './RoutingBlock';
import { Destination, ServiceBand, StatusMark } from './TicketMarks';

const lastChanged = (ticket) => ticket.updated_at || ticket.created_at;

const ticketTitle = (description) => {
  const firstLine = String(description || '').trim().split(/\n+/)[0];
  return firstLine || 'No description';
};

const ticketMeta = (ticket) => [
  ticket.caller_name,
  ticket.department,
  ticket.category_name && (ticket.subcategory_name && ticket.category_name !== 'Not sure'
    ? `${ticket.category_name} › ${ticket.subcategory_name}`
    : ticket.category_name)
].filter(Boolean).join(' · ');

// Shows one page the server already chose; paging itself happens in the API.
const TicketTable = ({
  tickets,
  loading = false,
  refreshing = false,
  total = tickets.length,
  page = 1,
  pageSize = tickets.length || 1,
  totalPages = 1,
  onPageChange,
  emptyState
}) => {
  const navigate = useNavigate();
  const pageTickets = tickets;
  const pageStart = (page - 1) * pageSize;

  if (loading) {
    return (
      <div className="card queue-card" aria-busy="true">
        <ul className="queue-skeleton" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((row) => (
            <li key={row}>
              <span className="skeleton-block" style={{ width: '40px' }} />
              <span className="skeleton-block" style={{ width: `${55 - row * 5}%` }} />
              <span className="skeleton-block" style={{ width: '120px' }} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (tickets.length === 0 && !refreshing) {
    return (
      <div className="card queue-card queue-empty">
        <p className="queue-empty-title">{emptyState?.title || 'No tickets.'}</p>
        {emptyState?.body && <p>{emptyState.body}</p>}
        {emptyState?.action && (
          <button type="button" className="btn-secondary" onClick={emptyState.action.onClick}>
            {emptyState.action.label}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`card queue-card${refreshing ? ' is-refreshing' : ''}`} aria-busy={refreshing || undefined}>
      <table className="queue-table hide-mobile">
        <colgroup>
          <col className="col-route" />
          <col />
          <col className="col-band" />
          <col className="col-status" />
          <col className="col-assignee" />
          <col className="col-updated" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Ticket</th>
            <th scope="col">Problem</th>
            <th scope="col">Priority</th>
            <th scope="col">Status</th>
            <th scope="col">Routed to</th>
            <th scope="col" className="queue-updated">Updated</th>
          </tr>
        </thead>
        <tbody>
          {pageTickets.map((ticket) => (
            <tr
              key={ticket.id}
              className={`queue-row${!ticket.assignee_id && ticket.status !== 'RESOLVED' ? ' is-unassigned' : ''}`}
              onClick={(event) => {
                if (event.target.closest('a')) return;
                navigate(`/tickets/${ticket.id}`);
              }}
            >
              <td><RoutingBlock ticket={ticket} /></td>
              <td>
                <Link to={`/tickets/${ticket.id}`} className="queue-title">{ticketTitle(ticket.description)}</Link>
                <div className="queue-meta">{ticketMeta(ticket)}</div>
              </td>
              <td><ServiceBand priority={ticket.priority} /></td>
              <td><StatusMark status={ticket.status} /></td>
              <td><Destination ticket={ticket} /></td>
              <td className="queue-updated">
                <time dateTime={lastChanged(ticket)} title={new Date(lastChanged(ticket)).toLocaleString()}>
                  {timeAgo(lastChanged(ticket))}
                </time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="queue-list show-mobile">
        {pageTickets.map((ticket) => (
          <li key={ticket.id}>
            <Link to={`/tickets/${ticket.id}`} className="queue-item">
              <span className="queue-item-top">
                <RoutingBlock ticket={ticket} />
                <time dateTime={lastChanged(ticket)}>{timeAgo(lastChanged(ticket))}</time>
              </span>
              <span className="queue-item-body">
                <span className="queue-title">{ticketTitle(ticket.description)}</span>
                <span className="queue-meta">{ticketMeta(ticket)}</span>
                <span className="queue-item-state">
                  <ServiceBand priority={ticket.priority} />
                  <StatusMark status={ticket.status} />
                  <Destination ticket={ticket} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <nav className="queue-pager" aria-label="Ticket pages">
          <span aria-live="polite">
            {pageStart + 1}–{pageStart + pageTickets.length} of {total}
          </span>
          <div>
            <button type="button" className="btn-secondary" onClick={() => onPageChange?.(page - 1)} disabled={page <= 1 || refreshing}>
              Previous
            </button>
            <span className="queue-pager-page">Page {page} of {totalPages}</span>
            <button type="button" className="btn-secondary" onClick={() => onPageChange?.(page + 1)} disabled={page >= totalPages || refreshing}>
              Next
            </button>
          </div>
        </nav>
      )}
    </div>
  );
};

export default TicketTable;
