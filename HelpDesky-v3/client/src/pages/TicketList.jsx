import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiPlus, FiSearch } from 'react-icons/fi';
import api from '../api';
import TicketTable from '../components/TicketTable';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../utils/errors';
import useTicketEvents from '../hooks/useTicketEvents';

const VIEWS = [
  { id: 'active', label: 'Active' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'All' }
];

const SORTS = {
  updated: 'Recently updated',
  newest: 'Newest first',
  oldest: 'Oldest first',
  priority: 'Priority'
};

const PAGE_SIZE = 7;
const SEARCH_DELAY_MS = 300;

const TicketList = () => {
  const { user } = useAuth();
  const isAgent = user?.role === 'AGENT';
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters and the page live in the URL so they survive opening a ticket and coming back.
  const scope = searchParams.get('scope') || (isAgent ? 'mine' : 'all');
  const requestedView = VIEWS.some((v) => v.id === searchParams.get('view')) ? searchParams.get('view') : 'active';
  // "Unassigned" only means something across the whole queue.
  const view = scope === 'mine' && requestedView === 'unassigned' ? 'active' : requestedView;
  const views = scope === 'mine' ? VIEWS.filter((v) => v.id !== 'unassigned') : VIEWS;
  const sort = SORTS[searchParams.get('sort')] ? searchParams.get('sort') : 'updated';
  const query = searchParams.get('q') || '';
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);

  const [searchInput, setSearchInput] = useState(query);
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const requestRef = useRef(0);
  const tableTopRef = useRef(null);

  const updateParams = useCallback((changes) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      Object.entries(changes).forEach(([key, value]) => {
        if (value === null || value === '' || value === undefined) next.delete(key);
        else next.set(key, String(value));
      });
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Keep the box in sync when the URL changes from elsewhere (e.g. "Clear search").
  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  // Search runs on the server, so wait until typing pauses.
  useEffect(() => {
    if (searchInput === query) return undefined;
    const timer = setTimeout(() => updateParams({ q: searchInput.trim() || null, page: null }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchInput, query, updateParams]);

  const fetchTickets = useCallback(async ({ background = false } = {}) => {
    const requestId = ++requestRef.current;
    if (!background) {
      setRefreshing(true);
      setLoadError('');
    }

    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE), view, sort });
    if (scope === 'mine') params.set('scope', 'my');
    if (query) params.set('q', query);

    try {
      const res = await api.get(`/tickets?${params}`);
      if (requestId !== requestRef.current) return; // a newer request is on its way
      setData(res.data);
      if (res.data.page !== page) updateParams({ page: res.data.page > 1 ? res.data.page : null });
    } catch (err) {
      console.error('Failed to fetch tickets', err);
      if (!background && requestId === requestRef.current) {
        setLoadError(errorMessage(err, "Couldn't load tickets. Try again."));
      }
    } finally {
      if (requestId === requestRef.current) setRefreshing(false);
    }
  }, [page, view, sort, scope, query, updateParams]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useTicketEvents(() => {
    fetchTickets({ background: true });
  }, Boolean(user));

  const goToPage = (nextPage) => {
    updateParams({ page: nextPage > 1 ? nextPage : null });
    tableTopRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const loading = data === null;
  const counts = data?.counts || { active: 0, unassigned: 0, resolved: 0, all: 0 };

  let summary = 'Loading tickets…';
  if (!loading && scope === 'mine') {
    summary = counts.active === 0
      ? 'Nothing active is assigned to you.'
      : `${counts.active} active ${counts.active === 1 ? 'ticket is' : 'tickets are'} assigned to you.`;
  } else if (!loading) {
    summary = `${counts.active} active in the queue${counts.unassigned > 0 ? `, ${counts.unassigned} unassigned` : ''}.`;
  }
  if (!loading && query) summary = `Showing matches for "${query}".`;

  let emptyState;
  if (query) {
    emptyState = {
      title: `No tickets match "${query}".`,
      body: 'Search looks at the ticket number, description, caller, department, assignee and category.',
      action: { label: 'Clear search', onClick: () => { setSearchInput(''); updateParams({ q: null, page: null }); } }
    };
  } else if (view === 'unassigned') {
    emptyState = { title: 'Every active ticket has someone on it.', body: 'New tickets show up here until someone takes them.' };
  } else if (scope === 'mine' && view === 'active') {
    emptyState = {
      title: 'Your list is clear.',
      body: 'Pick up a ticket nobody has taken yet.',
      action: { label: 'See unassigned tickets', onClick: () => updateParams({ scope: 'all', view: 'unassigned', page: null }) }
    };
  } else if (view === 'resolved') {
    emptyState = { title: 'No resolved tickets here yet.', body: null };
  } else {
    emptyState = { title: 'No tickets yet.', body: 'Tickets reported by staff, or created here, will appear in this list.' };
  }

  return (
    <div className="queue-page">
      <div className="page-header queue-header">
        <div>
          <h1>Tickets</h1>
          <p className="queue-summary" aria-live="polite">{summary}</p>
        </div>
        <div className="page-header-actions">
          <Link to="/tickets/new" className="btn queue-create">
            <FiPlus size={16} aria-hidden="true" />
            Create ticket
          </Link>
        </div>
      </div>

      <div className="queue-toolbar">
        <div className="queue-filters">
          <div className="segmented" role="group" aria-label="Whose tickets">
            {[['all', 'All tickets'], ['mine', 'Mine']].map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={scope === id}
                className={scope === id ? 'is-active' : ''}
                onClick={() => updateParams({ scope: id, page: null })}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="queue-views" role="group" aria-label="Which tickets">
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={view === v.id}
                className={`queue-view${view === v.id ? ' is-active' : ''}`}
                onClick={() => updateParams({ view: v.id === 'active' ? null : v.id, page: null })}
              >
                {v.label}
                <span className="queue-view-count">{loading ? '–' : counts[v.id]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="queue-tools">
          <div className="queue-search">
            <FiSearch size={16} aria-hidden="true" />
            <label htmlFor="queue-search" className="visually-hidden">Search tickets</label>
            <input
              id="queue-search"
              type="search"
              value={searchInput}
              placeholder="Search number, caller, text…"
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <label htmlFor="queue-sort" className="visually-hidden">Sort tickets</label>
          <select id="queue-sort" className="queue-sort" value={sort} onChange={(e) => updateParams({ sort: e.target.value === 'updated' ? null : e.target.value, page: null })}>
            {Object.entries(SORTS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div ref={tableTopRef} className="queue-anchor" />
      {loadError && !data ? (
        <div className="card queue-message" role="alert">
          <p>{loadError}</p>
          <button type="button" className="btn-secondary" onClick={() => fetchTickets()}>Try again</button>
        </div>
      ) : (
        <>
          {loadError && <p className="queue-inline-error" role="alert">{loadError}</p>}
          <TicketTable
            tickets={data?.tickets || []}
            loading={loading}
            refreshing={refreshing && !loading}
            total={data?.total || 0}
            page={data?.page || page}
            pageSize={data?.page_size || PAGE_SIZE}
            totalPages={data?.total_pages || 1}
            onPageChange={goToPage}
            emptyState={emptyState}
          />
        </>
      )}
    </div>
  );
};

export default TicketList;
