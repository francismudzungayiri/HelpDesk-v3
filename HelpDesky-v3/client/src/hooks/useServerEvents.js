import { useEffect, useRef } from 'react';

const SERVER_EVENT_NAMES = [
  'connected',
  'ticket.created',
  'ticket.updated',
  'ticket.comment_added',
  'ticket.note_added',
  'notification.created',
  'notification.read'
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

// One connection per tab, shared by every subscriber. Browsers allow only a handful of open
// connections per server, so a connection per component would soon block other requests.
const subscribers = new Set();
let source = null;

const openStream = () => {
  const eventsUrl = getEventsUrl();
  if (!eventsUrl || typeof EventSource === 'undefined') return;

  source = new EventSource(eventsUrl);
  SERVER_EVENT_NAMES.forEach((eventName) => {
    source.addEventListener(eventName, (event) => {
      const message = { type: eventName, payload: parsePayload(event.data) };
      subscribers.forEach((subscriber) => subscriber(message));
    });
  });
};

const subscribe = (subscriber) => {
  subscribers.add(subscriber);
  if (!source) openStream();

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0 && source) {
      source.close();
      source = null;
    }
  };
};

const useServerEvents = (eventNames, onEvent, enabled = true) => {
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return undefined;

    return subscribe((message) => {
      if (eventNames.includes(message.type)) {
        onEventRef.current?.(message);
      }
    });
  }, [enabled, eventNames]);
};

export default useServerEvents;
