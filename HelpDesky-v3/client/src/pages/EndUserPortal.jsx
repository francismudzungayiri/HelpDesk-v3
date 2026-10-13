import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiChevronDown, FiPlus, FiX } from 'react-icons/fi';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../utils/errors';
import useTicketEvents from '../hooks/useTicketEvents';
import { getLastChanged, getStatusPhrase, getTicketArea, getTicketTitle, relativeTime } from '../utils/ticketStatus';

const PAGE_SIZE = 7;
const FLASH_MS = 1600;

const EMPTY_SECTION = { items: [], total: 0, pages: 0 };

// Loads pages 1..pageCount of one view and joins them, so a refresh keeps what's already on screen.
const fetchSection = async (view, pageCount) => {
  const responses = await Promise.all(
    Array.from({ length: Math.max(1, pageCount) }, (_, index) => api.get(
      `/tickets?view=${view}&sort=updated&page=${index + 1}&page_size=${PAGE_SIZE}`
    ))
  );
  const seen = new Set();
  const items = responses.flatMap((r) => r.data.tickets).filter((t) => (seen.has(t.id) ? false : seen.add(t.id)));
  return { items, total: responses[0].data.total, pages: Math.max(1, pageCount), counts: responses[0].data.counts };
};

const BoardRow = ({ ticket, flashing }) => {
  const status = getStatusPhrase(ticket);
  const area = getTicketArea(ticket);

  return (
    <li>
      <Link
        to={`/tickets/${ticket.id}`}
        className={`board-row tone-${status.tone}${flashing ? ' is-flashing' : ''}`}
      >
        <span className="board-num">#{ticket.id}</span>
        <span className="board-what">
          <span className="board-title">{getTicketTitle(ticket.description)}</span>
          <span className="board-meta">
            {[area, `Reported ${relativeTime(ticket.created_at)}`].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className="board-status">
          <span className="board-phrase">{status.phrase}</span>
          <span className="board-when">Updated {relativeTime(getLastChanged(ticket))}</span>
        </span>
      </Link>
    </li>
  );
};

const BoardSkeleton = () => (
  <ul className="board-list" aria-hidden="true">
    {[0, 1, 2].map((row) => (
      <li key={row} className="board-row board-row-skeleton">
        <span className="skeleton-block" style={{ width: '36px' }} />
        <span className="board-what">
          <span className="skeleton-block" style={{ width: '70%' }} />
          <span className="skeleton-block skeleton-thin" style={{ width: '40%' }} />
        </span>
        <span className="skeleton-block skeleton-status" />
      </li>
    ))}
  </ul>
);

const EndUserPortal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [openSection, setOpenSection] = useState(EMPTY_SECTION);
  const [fixedSection, setFixedSection] = useState(EMPTY_SECTION);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showFixed, setShowFixed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(null);
  const pagesRef = useRef({ open: 1, fixed: 0 });
  const [flashIds, setFlashIds] = useState(() => new Set());
  const mountedRef = useRef(true);
  const flashTimers = useRef([]);

  const sentId = location.state?.sentId ? Number(location.state.sentId) : null;

  useEffect(() => {
    mountedRef.current = true;
    const timers = flashTimers.current;
    return () => {
      mountedRef.current = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  const flash = useCallback((ticketId) => {
    if (!Number.isFinite(ticketId)) return;
    setFlashIds((previous) => new Set(previous).add(ticketId));
    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      setFlashIds((previous) => {
        const next = new Set(previous);
        next.delete(ticketId);
        return next;
      });
    }, FLASH_MS);
    flashTimers.current.push(timer);
  }, []);

  const fetchTickets = useCallback(async ({ background = false } = {}) => {
    if (!background) {
      setLoading(true);
      setLoadError('');
    }

    try {
      const [open, fixed] = await Promise.all([
        fetchSection('active', pagesRef.current.open),
        pagesRef.current.fixed > 0 ? fetchSection('resolved', pagesRef.current.fixed) : null
      ]);
      if (!mountedRef.current) return false;
      setOpenSection(open);
      setCounts(open.counts);
      if (fixed) setFixedSection(fixed);
      return true;
    } catch (err) {
      console.error('Error fetching tickets:', err);
      if (!background && mountedRef.current) setLoadError(errorMessage(err, "We couldn't load your tickets. Try again."));
      return false;
    } finally {
      if (!background && mountedRef.current) setLoading(false);
    }
  }, []);

  const loadMore = async (section) => {
    const key = section === 'active' ? 'open' : 'fixed';
    const nextPages = pagesRef.current[key] + 1;
    setLoadingMore(key);
    try {
      const result = await fetchSection(section, nextPages);
      pagesRef.current[key] = nextPages;
      if (key === 'open') setOpenSection(result);
      else setFixedSection(result);
      setCounts(result.counts);
    } catch (err) {
      setLoadError(errorMessage(err, "We couldn't load more tickets. Try again."));
    } finally {
      setLoadingMore(null);
    }
  };

  const toggleFixed = () => {
    const opening = !showFixed;
    setShowFixed(opening);
    if (opening && pagesRef.current.fixed === 0) {
      pagesRef.current.fixed = 0;
      loadMore('resolved');
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (sentId) flash(sentId);
  }, [sentId, flash]);

  useTicketEvents(async ({ payload }) => {
    const loaded = await fetchTickets({ background: true });
    if (loaded) flash(Number(payload?.ticket_id));
  }, Boolean(user));

  const dismissConfirmation = () => {
    navigate(location.pathname, { replace: true, state: null });
  };

  const openTickets = openSection.items;
  const fixedTickets = fixedSection.items;
  const openCount = counts?.active ?? 0;
  const fixedCount = counts?.resolved ?? 0;
  const totalCount = counts?.all ?? 0;
  const greetingName = (user?.name || user?.username || '').split(' ')[0];

  let summary = 'Report a problem, or check on one you have already sent.';
  if (!loading && !loadError && totalCount > 0) {
    summary = openCount === 0
      ? 'Nothing open right now. Everything you reported has been fixed.'
      : `You have ${openCount} open ${openCount === 1 ? 'ticket' : 'tickets'}.`;
  }

  return (
    <div className="portal-page">
      <div className="portal-intro">
        <h1>Hello{greetingName ? `, ${greetingName}` : ''}</h1>
        <p>{summary}</p>
      </div>

      {sentId && (
        <section className="sent-band" aria-live="polite">
          <div className="sent-number">#{sentId}</div>
          <div className="sent-copy">
            <h2>Sent to IT</h2>
            <p>It's on your board below. You'll see here when someone picks it up.</p>
          </div>
          <button type="button" className="sent-dismiss" onClick={dismissConfirmation} aria-label="Dismiss confirmation">
            <FiX size={18} aria-hidden="true" />
          </button>
        </section>
      )}

      <Link to="/tickets/new" className="report-cta">
        <FiPlus size={22} aria-hidden="true" />
        <span>Report a problem</span>
      </Link>

      <section className="board" aria-labelledby="board-heading">
        <div className="board-head">
          <h2 id="board-heading">Your tickets</h2>
        </div>

        {loading ? (
          <BoardSkeleton />
        ) : loadError && !counts ? (
          <div className="board-message board-error" role="alert">
            <FiAlertCircle size={20} aria-hidden="true" />
            <div>
              <p>{loadError}</p>
              <button type="button" className="btn-secondary" onClick={() => fetchTickets()}>Try again</button>
            </div>
          </div>
        ) : totalCount === 0 ? (
          <div className="board-message board-empty">
            <p className="board-empty-title">Nothing reported yet.</p>
            <p>When something stops working, like a laptop, a password or the Wi-Fi, tell IT here. Each problem gets a ticket number and shows up on this board, so you can see where it stands.</p>
          </div>
        ) : (
          <>
            <div className="board-columns" aria-hidden="true">
              <span>Ticket</span>
              <span>What you reported</span>
              <span>Where it stands</span>
            </div>

            {openTickets.length > 0 ? (
              <>
                <ul className="board-list">
                  {openTickets.map((ticket) => (
                    <BoardRow key={ticket.id} ticket={ticket} flashing={flashIds.has(ticket.id)} />
                  ))}
                </ul>
                {openSection.total > openTickets.length && (
                  <button type="button" className="board-more" onClick={() => loadMore('active')} disabled={loadingMore === 'open'}>
                    {loadingMore === 'open' ? 'Loading…' : `Show more open tickets (${openSection.total - openTickets.length} more)`}
                  </button>
                )}
              </>
            ) : (
              <div className="board-message board-quiet">
                <p>No open tickets.</p>
              </div>
            )}

            {loadError && <p className="board-inline-error" role="alert">{loadError}</p>}

            {fixedCount > 0 && (
              <div className="board-fixed">
                <button
                  type="button"
                  className="board-fixed-toggle"
                  aria-expanded={showFixed}
                  aria-controls="board-fixed-list"
                  onClick={toggleFixed}
                >
                  <FiChevronDown size={16} aria-hidden="true" className="board-fixed-chevron" />
                  {showFixed ? 'Hide fixed' : 'Show fixed'} ({fixedCount})
                </button>

                {showFixed && (
                  <>
                    <ul className="board-list" id="board-fixed-list" aria-busy={loadingMore === 'fixed' || undefined}>
                      {fixedTickets.map((ticket) => (
                        <BoardRow key={ticket.id} ticket={ticket} flashing={flashIds.has(ticket.id)} />
                      ))}
                    </ul>
                    {fixedTickets.length === 0 && loadingMore === 'fixed' && (
                      <p className="board-loading-more" aria-live="polite">Loading fixed tickets…</p>
                    )}
                    {fixedSection.total > fixedTickets.length && fixedTickets.length > 0 && (
                      <button type="button" className="board-more" onClick={() => loadMore('resolved')} disabled={loadingMore === 'fixed'}>
                        {loadingMore === 'fixed' ? 'Loading…' : `Show older (${fixedSection.total - fixedTickets.length} more)`}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default EndUserPortal;
