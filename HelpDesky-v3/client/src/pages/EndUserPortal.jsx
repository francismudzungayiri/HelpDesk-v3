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
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({
    description: '',
    priority: 'MEDIUM'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await api.get('/tickets');
      setTickets(response.data);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const loadId = toast.loading('Submitting your ticket...');

    try {
      await api.post('/tickets', {
        description: newTicket.description,
        priority: newTicket.priority
      });

      toast.success('Ticket submitted successfully!', { id: loadId });
      setNewTicket({ description: '', priority: 'MEDIUM' });
      setShowNewTicket(false);
      fetchTickets();
    } catch (err) {
      const messages = err.response?.data?.errors || [err.response?.data?.message || 'Failed to submit ticket'];
      messages.forEach(msg => toast.error(msg, { id: loadId }));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'OPEN': return '#f59e0b';
      case 'IN_PROGRESS': return '#3b82f6';
      case 'RESOLVED': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case 'HIGH': return '#ef4444';
      case 'MEDIUM': return '#f59e0b';
      case 'LOW': return '#10b981';
      default: return '#6b7280';
    }
  };

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'OPEN').length,
    inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter(t => t.status === 'RESOLVED').length
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '15px' }}>
        <div style={{ color: '#6b778c', fontSize: '18px' }}>Loading your tickets...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: 0, marginBottom: '10px' }}>My Support Tickets</h1>
        <p style={{ color: '#6b778c', margin: 0 }}>Welcome, {user?.name}</p>
      </div>

      {/* Stats Cards */}
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

      {/* New Ticket Button */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          className="btn" 
          onClick={() => setShowNewTicket(!showNewTicket)}
        >
          {showNewTicket ? '✕ Cancel' : '+ New Ticket'}
        </button>
      </div>

      {/* New Ticket Form */}
      {showNewTicket && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginTop: 0 }}>Submit New Ticket</h3>
          <form onSubmit={handleSubmitTicket}>
            <div className="form-group">
              <label>Describe your issue *</label>
              <textarea
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                rows="4"
                required
                placeholder="Please provide details about your issue..."
              />
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                value={newTicket.priority}
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </form>
        </div>
      )}

      {/* Tickets List */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Your Tickets</h3>
        
        {tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b778c' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📋</div>
            <p>No tickets yet. Click "New Ticket" to get started.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #dfe1e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Priority</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Created</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => (
                  <tr key={ticket.id} style={{ borderBottom: '1px solid #dfe1e6' }}>
                    <td style={{ padding: '12px' }}>#{ticket.id}</td>
                    <td style={{ padding: '12px', maxWidth: '300px' }}>
                      <div style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }}>
                        {ticket.description}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: getPriorityBadgeColor(ticket.priority) + '20',
                        color: getPriorityBadgeColor(ticket.priority)
                      }}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: getStatusBadgeColor(ticket.status) + '20',
                        color: getStatusBadgeColor(ticket.status)
                      }}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#6b778c', fontSize: '14px' }}>
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </td>
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
        )}
      </div>
    </div>
  );
};

export default EndUserPortal;
