import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const EndUserPortal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await api.get('/tickets');
      setTickets(response.data);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      toast.error('Failed to load your tickets');
    } finally {
      setLoading(false);
    }
  };

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
            <div className="table-responsive table-wide hide-mobile">
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
                  {tickets.map((ticket) => (
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

            <div className="show-mobile" style={{ display: 'grid', gap: '10px' }}>
              {tickets.map((ticket) => (
                <div key={ticket.id} style={{ border: '1px solid #dfe1e6', borderRadius: '8px', padding: '12px' }}>
                  <div className="flex justify-between items-center" style={{ marginBottom: '10px' }}>
                    <strong>#{ticket.id}</strong>
                    <button
                      className="btn-secondary"
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      View
                    </button>
                  </div>
                  <div style={{ marginBottom: '10px', lineHeight: 1.4 }}>{ticket.description}</div>
                  <div style={{ fontSize: '13px', color: '#6b778c', marginBottom: '6px' }}>
                    {ticket.category_name ? `${ticket.category_name} / ${ticket.subcategory_name || '-'}` : '-'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
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
                  </div>
                  <div style={{ color: '#6b778c', fontSize: '12px' }}>{new Date(ticket.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EndUserPortal;
