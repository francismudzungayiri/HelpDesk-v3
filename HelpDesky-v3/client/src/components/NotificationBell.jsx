import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiBell } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../api';
import useServerEvents from '../hooks/useServerEvents';
import { formatDateTime } from '../utils/formatDate';
import { enableNotificationSound, playNotificationSound } from '../utils/notificationSound';

const NOTIFICATION_EVENT_NAMES = ['connected', 'notification.created', 'notification.read'];
const LIST_LIMIT = 30;
const PANEL_WIDTH = 380;
const PANEL_MARGIN = 12;

const ticketIdFromPath = (pathname) => {
  const match = pathname.match(/^\/tickets\/(\d+)$/);
  return match ? Number(match[1]) : null;
};

// Sits above the sidebar's and top bar's stacking contexts, so it is placed from the bell's position.
const getPanelPosition = (button) => {
  const rect = button.getBoundingClientRect();
  const width = Math.min(PANEL_WIDTH, window.innerWidth - PANEL_MARGIN * 2);
  const left = Math.min(Math.max(rect.left, PANEL_MARGIN), window.innerWidth - width - PANEL_MARGIN);
  const top = rect.bottom + 8;
  return { top, left, width, maxHeight: Math.min(480, window.innerHeight - top - PANEL_MARGIN) };
};

const NotificationBell = () => {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState('loading');
  const [panelPosition, setPanelPosition] = useState(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const hasConnectedRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isOpen = panelPosition !== null;

  const load = useCallback(() => (
    api.get('/notifications')
      .then((res) => {
        setItems(res.data.items);
        setUnreadCount(res.data.unread_count);
        setStatus('ready');
      })
      .catch(() => setStatus('error'))
  ), []);

  const markTicketRead = useCallback((ticketId) => (
    api.post(`/notifications/tickets/${ticketId}/read`)
      .then((res) => {
        const readAt = new Date().toISOString();
        setItems((current) => current.map((item) => (
          item.ticket_id === ticketId && !item.read_at ? { ...item, read_at: readAt } : item
        )));
        setUnreadCount(res.data.unread_count);
      })
      .catch(() => load())
  ), [load]);

  const closePanel = useCallback(({ restoreFocus = false } = {}) => {
    setPanelPosition(null);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  const openTicket = (ticketId) => {
    closePanel();
    if (ticketIdFromPath(location.pathname) === ticketId) {
      markTicketRead(ticketId);
    } else {
      navigate(`/tickets/${ticketId}`);
    }
  };

  const showToast = (notification) => {
    toast((t) => (
      <button
        type="button"
        className="notification-toast"
        onClick={() => {
          toast.dismiss(t.id);
          openTicket(notification.ticket_id);
        }}
      >
        <span className="notification-title">{notification.title}</span>
        {notification.body && <span className="notification-body">{notification.body}</span>}
      </button>
    ), { id: `notification-${notification.id}`, duration: 6000 });
  };

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => enableNotificationSound(), []);

  // Opening a ticket, however you got there, counts as seeing its notifications.
  const openTicketId = ticketIdFromPath(location.pathname);
  useEffect(() => {
    if (openTicketId) markTicketRead(openTicketId);
  }, [openTicketId, markTicketRead]);

  useServerEvents(NOTIFICATION_EVENT_NAMES, ({ type, payload }) => {
    if (type === 'connected') {
      // Later connections mean the stream dropped and came back: catch up on what was missed.
      if (hasConnectedRef.current) load();
      hasConnectedRef.current = true;
      return;
    }

    if (type === 'notification.read') {
      load();
      return;
    }

    setItems((current) => [payload, ...current.filter((item) => item.id !== payload.id)].slice(0, LIST_LIMIT));

    // The open ticket page already shows this live, so it needs no toast or sound and stays read.
    if (payload.ticket_id === openTicketId && document.visibilityState === 'visible') {
      markTicketRead(payload.ticket_id);
      return;
    }

    setUnreadCount((count) => count + 1);
    showToast(payload);
    playNotificationSound();
  });

  useEffect(() => {
    if (!isOpen) return undefined;

    panelRef.current?.focus();

    const handleKey = (event) => {
      if (event.key === 'Escape') closePanel({ restoreFocus: true });
    };
    const handlePointer = (event) => {
      if (!panelRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) {
        closePanel();
      }
    };
    const handleResize = () => closePanel();

    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handlePointer);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handlePointer);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, closePanel]);

  const togglePanel = () => {
    if (isOpen) {
      closePanel();
      return;
    }
    // The panel lists these already, and a toast would sit on top of it on a phone.
    items.forEach((item) => toast.dismiss(`notification-${item.id}`));
    setPanelPosition(getPanelPosition(buttonRef.current));
    load();
  };

  const markAllRead = async () => {
    const previousItems = items;
    const previousCount = unreadCount;
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => (item.read_at ? item : { ...item, read_at: readAt })));
    setUnreadCount(0);

    try {
      await api.post('/notifications/read-all');
    } catch {
      setItems(previousItems);
      setUnreadCount(previousCount);
      toast.error("Couldn't mark your notifications as read. Try again.");
    }
  };

  const unreadLabel = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="notification-bell"
        onClick={togglePanel}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <FiBell size={18} aria-hidden="true" />
        {unreadCount > 0 && <span className="notification-badge" aria-hidden="true">{unreadLabel}</span>}
      </button>

      {isOpen && createPortal(
        <div
          ref={panelRef}
          className="notification-panel"
          role="dialog"
          aria-label="Notifications"
          tabIndex={-1}
          style={panelPosition}
          onBlur={(event) => {
            const next = event.relatedTarget;
            if (next && !panelRef.current?.contains(next) && !buttonRef.current?.contains(next)) closePanel();
          }}
        >
          <div className="notification-panel-header">
            <h2>Notifications</h2>
            {unreadCount > 0 && (
              <button type="button" className="notification-mark-all" onClick={markAllRead}>
                Mark all as read
              </button>
            )}
          </div>

          {items.length > 0 ? (
            <ul className="notification-list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`notification-item${item.read_at ? '' : ' is-unread'}`}
                    onClick={() => openTicket(item.ticket_id)}
                  >
                    <span className="notification-dot" aria-hidden="true" />
                    <span className="notification-text">
                      <span className="notification-title">
                        {!item.read_at && <span className="visually-hidden">Unread: </span>}
                        {item.title}
                      </span>
                      {item.body && <span className="notification-body">{item.body}</span>}
                      <span className="notification-time">{formatDateTime(item.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="notification-empty">
              {status === 'loading' && <p>Loading…</p>}
              {status === 'error' && (
                <>
                  <p>Couldn&apos;t load your notifications.</p>
                  <button type="button" className="notification-mark-all" onClick={load}>Try again</button>
                </>
              )}
              {status === 'ready' && (
                <>
                  <p className="notification-empty-title">You&apos;re all caught up</p>
                  <p>Ticket updates for you will appear here.</p>
                </>
              )}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

export default NotificationBell;
