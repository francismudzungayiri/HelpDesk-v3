import React from 'react';
import { priorityLabel, statusLabel } from '../utils/labels';
import { destinationName } from '../utils/routing';
import Avatar from './Avatar';

export const ServiceBand = ({ priority }) => (
  <span className={`tag priority-tag priority-tag-${priority}`}>
    {priorityLabel(priority)}
    <span className="visually-hidden"> priority</span>
  </span>
);

export const StatusMark = ({ status }) => (
  <span className={`tag status-tag status-tag-${status}`}>{statusLabel(status)}</span>
);

export const Destination = ({ ticket }) => {
  const name = destinationName(ticket);
  if (name) {
    return (
      <span className="destination" title={ticket.assignee_name}>
        <Avatar name={ticket.assignee_name} size={22} />
        {name}
      </span>
    );
  }
  if (ticket.status === 'RESOLVED') return <span className="destination muted">—</span>;
  return <span className="tag unassigned-tag">Unassigned</span>;
};

