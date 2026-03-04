import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import useTicketEvents from '../hooks/useTicketEvents';

const ITEMS_PER_PAGE = 10;

const EndUserPortal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchTickets = useCallback(async ({ background = false } = {}) => {
    if (!background && mountedRef.current) {
      setLoading(true);
    }

    try {
      const response = await api.get('/tickets');
      if (mountedRef.current) {
        setTickets(response.data);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
      if (!background) {
        toast.error('Failed to load your tickets');
      }
    } finally {
      if (!background && mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchTickets({ background: false });
  }, [fetchTickets]);

  useTicketEvents(() => {
    fetchTickets({ background: true });
  }, Boolean(user));

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'OPEN':
        return '#f59e0b';
      case 'IN_PROGRESS':
        return '#3b82f6';
      case 'RESOLVED':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case 'HIGH':
        return '#ef4444';
      case 'MEDIUM':
        return '#f59e0b';
      case 'LOW':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const stats = {
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === 'OPEN').length,
    inProgress: tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length,
    resolved: tickets.filter((ticket) => ticket.status === 'RESOLVED').length
  };

  const totalPages = Math.max(1, Math.ceil(tickets.length / ITEMS_PER_PAGE));
  const currentPageClamped = Math.min(currentPage, totalPages);
  const pageStartIndex = (currentPageClamped - 1) * ITEMS_PER_PAGE;
  const paginatedTickets = tickets.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE);
  const startRowNumber = tickets.length === 0 ? 0 : pageStartIndex + 1;
  const endRowNumber = tickets.length === 0 ? 0 : pageStartIndex + paginatedTickets.length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '15px' }}>
        <div style={{ color: '#6b778c', fontSize: '18px' }}>Loading your tickets...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: 0, marginBottom: '10px' }}>My Support Tickets</h1>
        <p style={{ color: '#6b778c', margin: 0 }}>Welcome, {user?.name}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#667eea' }}>{stats.total}</div>
          <div style={{ color: '#6b778c', marginTop: '5px' }}>Total Tickets</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.open}</div>
          <div style={{ color: '#6b778c', marginTop: '5px' }}>Open</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>{stats.inProgress}</div>
          <div style={{ color: '#6b778c', marginTop: '5px' }}>In Progress</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{stats.resolved}</div>
          <div style={{ color: '#6b778c', marginTop: '5px' }}>Resolved</div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button className="btn" onClick={() => navigate('/tickets/new')}>
          + New Ticket
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Your Tickets</h3>

        {tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b778c' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📋</div>
            <p>No tickets yet. Click "New Ticket" to get started.</p>
          </div>
        ) : (
          <div>
            <div className="table-responsive table-wide">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #dfe1e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>ID</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Category</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Priority</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Created</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTickets.map((ticket) => (
                    <tr key={ticket.id} style={{ borderBottom: '1px solid #dfe1e6' }}>
                      <td style={{ padding: '12px' }}>#{ticket.id}</td>
                      <td style={{ padding: '12px', maxWidth: '300px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.description}</div>
                      </td>
                      <td style={{ padding: '12px', color: '#42526e' }}>
                        {ticket.category_name ? `${ticket.category_name} / ${ticket.subcategory_name || '-'}` : '-'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: getPriorityBadgeColor(ticket.priority) + '20',
                            color: getPriorityBadgeColor(ticket.priority)
                          }}
                        >
                          {ticket.priority}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: getStatusBadgeColor(ticket.status) + '20',
                            color: getStatusBadgeColor(ticket.status)
                          }}
                        >
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#6b778c', fontSize: '14px' }}>{new Date(ticket.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '12px' }}>
                        <button
                          className="btn-secondary"
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                          style={{ padding: '6px 12px', fontSize: '14px' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                marginTop: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ fontSize: '13px', color: '#6b778c' }}>
                Showing {startRowNumber}-{endRowNumber} of {tickets.length}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCurrentPage(Math.max(1, currentPageClamped - 1))}
                  disabled={currentPageClamped === 1}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '13px', color: '#42526e' }}>
                  Page {currentPageClamped} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPageClamped + 1))}
                  disabled={currentPageClamped === totalPages}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EndUserPortal;
