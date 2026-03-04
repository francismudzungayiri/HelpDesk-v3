import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import TicketTable from '../components/TicketTable';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import useTicketEvents from '../hooks/useTicketEvents';

const TicketList = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('OPEN'); // Default to OPEN
  const [scope, setScope] = useState('ALL');
  const { user } = useAuth();
  const isAgent = user?.role === 'AGENT';
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isAgent) {
      setScope('MY');
      return;
    }
    setScope('ALL');
  }, [isAgent]);

  const fetchTickets = useCallback(async ({ background = false } = {}) => {
    if (!background && mountedRef.current) {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      if (isAgent && scope === 'MY') params.set('scope', 'my');

      const query = params.toString();
      const res = await api.get(`/tickets${query ? `?${query}` : ''}`);
      if (mountedRef.current) {
        setTickets(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch tickets', err);
      if (!background) {
        toast.error('Failed to fetch tickets');
      }
    } finally {
      if (!background && mountedRef.current) {
        setLoading(false);
      }
    }
  }, [filter, isAgent, scope]);

  useEffect(() => {
    fetchTickets({ background: false });
  }, [fetchTickets]);

  useTicketEvents(() => {
    fetchTickets({ background: true });
  }, Boolean(user));

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Tickets</h2>
          {isAgent && (
            <div className="reports-tabs" role="tablist" aria-label="Ticket list scope" style={{ marginTop: '10px', marginBottom: 0 }}>
              <button
                type="button"
                role="tab"
                aria-selected={scope === 'ALL'}
                className={`reports-tab-button ${scope === 'ALL' ? 'active' : ''}`}
                onClick={() => setScope('ALL')}
              >
                All Tickets
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={scope === 'MY'}
                className={`reports-tab-button ${scope === 'MY' ? 'active' : ''}`}
                onClick={() => setScope('MY')}
              >
                My Tickets
              </button>
            </div>
          )}
        </div>
        <div className="page-header-actions">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="">All Tickets</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          <Link to="/tickets/new" className="btn">Create Ticket</Link>
        </div>
      </div>

      {loading ? (
        <div>Loading tickets...</div>
      ) : (
        <TicketTable tickets={tickets} />
      )}
    </div>
  );
};

export default TicketList;
