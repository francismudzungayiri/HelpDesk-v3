import { useEffect, useMemo, useRef } from 'react';

const TICKET_EVENT_NAMES = [
  'ticket.created',
  'ticket.updated',
  'ticket.comment_added',
  'ticket.note_added'
];

const getEventsUrl = () => {
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/$/, '');
  const token = localStorage.getItem('token');

  if (!token) return '';
  return `${apiBase}/events?token=${encodeURIComponent(token)}`;
};

const parsePayload = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const useTicketEvents = (onEvent, enabled = true) => {
  const onEventRef = useRef(onEvent);
  const eventsUrl = useMemo(() => getEventsUrl(), []);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled || !eventsUrl || typeof EventSource === 'undefined') {
      return undefined;
    }

    const source = new EventSource(eventsUrl);
    const listeners = [];

    TICKET_EVENT_NAMES.forEach((eventName) => {
      const handler = (event) => {
        onEventRef.current?.({
          type: eventName,
          payload: parsePayload(event.data)
        });
      };

      source.addEventListener(eventName, handler);
      listeners.push({ eventName, handler });
    });

    return () => {
      listeners.forEach(({ eventName, handler }) => {
        source.removeEventListener(eventName, handler);
      });
      source.close();
    };
  }, [enabled, eventsUrl]);
};

export default useTicketEvents;
