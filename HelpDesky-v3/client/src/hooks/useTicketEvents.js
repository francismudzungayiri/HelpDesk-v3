import useServerEvents from './useServerEvents';

const TICKET_EVENT_NAMES = [
  'ticket.created',
  'ticket.updated',
  'ticket.comment_added',
  'ticket.note_added'
];

const useTicketEvents = (onEvent, enabled = true) => {
  useServerEvents(TICKET_EVENT_NAMES, onEvent, enabled);
};

export default useTicketEvents;
