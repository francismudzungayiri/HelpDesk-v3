// Plain-language ticket status for end users.
import { timeAgo } from './dateUtils';

const firstName = (name) => (name ? String(name).trim().split(/\s+/)[0] : '');

export const getStatusPhrase = (ticket) => {
  const assignee = firstName(ticket?.assignee_name);

  if (ticket?.status === 'RESOLVED') {
    return {
      tone: 'resolved',
      phrase: 'Fixed',
      detail: 'IT marked this as fixed. If it is still happening, send a message below.'
    };
  }

  if (ticket?.status === 'IN_PROGRESS') {
    return {
      tone: 'progress',
      phrase: assignee ? `${assignee} is working on it` : 'Being worked on',
      detail: 'Someone in IT is on this now.'
    };
  }

  if (assignee) {
    return {
      tone: 'open',
      phrase: `With ${assignee}`,
      detail: `${assignee} has picked this up and will start on it.`
    };
  }

  return {
    tone: 'open',
    phrase: 'Waiting for IT',
    detail: 'Sent to IT. Nobody has picked it up yet.'
  };
};

// The first line of what the person wrote, used as the ticket's title.
export const getTicketTitle = (description, maxLength = 90) => {
  const firstLine = String(description || '').trim().split(/\n+/)[0] || 'No description';
  if (firstLine.length <= maxLength) return firstLine;
  return `${firstLine.slice(0, maxLength - 1).trimEnd()}…`;
};

export const getTicketArea = (ticket) => {
  if (!ticket?.category_name) return '';
  if (!ticket.subcategory_name || ticket.category_name === 'Not sure') return ticket.category_name;
  return `${ticket.category_name} › ${ticket.subcategory_name}`;
};

export const getLastChanged = (ticket) => ticket?.updated_at || ticket?.created_at;

export const relativeTime = (date) => {
  if (!date) return '';
  const seconds = (Date.now() - new Date(date).getTime()) / 1000;
  if (seconds < 45) return 'just now';
  return timeAgo(date);
};
