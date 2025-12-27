import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Form State for "Edit" actions
  const [status, setStatus] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [ticketRes, usersRes] = await Promise.all([
        api.get(`/tickets/${id}`),
        api.get('/users')
      ]);
      const t = ticketRes.data;
      setTicket(t);
      setUsers(usersRes.data);
      
      // Init form state
      setStatus(t.status);
      setAssigneeId(t.assignee_id || '');
      setResolutionNote(t.resolution_note || '');
    } catch (err) {
      console.error('Error fetching data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await api.patch(`/tickets/${id}`, {
        status,
        assignee_id: assigneeId || null,
        resolution_note: resolutionNote
      });
      // Refresh data
      fetchData();
    } catch (err) {
      alert('Failed to update ticket');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div>Loading details...</div>;
  if (!ticket) return <div>Ticket not found</div>;

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
         <button onClick={() => navigate('/')} className="btn-secondary">← Back to List</button>
      </div>

      <div className="flex gap-2" style={{ alignItems: 'flex-start' }}>
        {/* Left Column: Ticket Info */}
        <div style={{ flex: 2 }}>
          <div className="card">
            <div className="flex justify-between items-center" style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Ticket #{ticket.id}</h2>
              <span className={`badge priority-${ticket.priority}`} style={{ fontSize: '14px', padding: '4px 8px' }}>
                {ticket.priority} Priority
              </span>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#6b778c', marginBottom: '5px' }}>Caller</h4>
              <div style={{ fontSize: '16px' }}>{ticket.caller_name} ({ticket.department})</div>
              {ticket.phone && <div style={{ color: '#6b778c' }}>{ticket.phone}</div>}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#6b778c', marginBottom: '5px' }}>Issue Description</h4>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{ticket.description}</p>
            </div>

            <div style={{ fontSize: '12px', color: '#6b778c', borderTop: '1px solid #dfe1e6', paddingTop: '15px' }}>
              Created: {new Date(ticket.created_at).toLocaleString()}
              {ticket.updated_at !== ticket.created_at && <span> • Updated: {new Date(ticket.updated_at).toLocaleString()}</span>}
            </div>
          </div>
        </div>

        {/* Right Column: Key Actions */}
        <div style={{ flex: 1 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Actions</h3>
            
            <div className="form-group">
              <label>Status</label>
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
                style={{ fontWeight: '500' }}
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            <div className="form-group">
              <label>Assignee</label>
              <select 
                value={assigneeId} 
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Resolution Note</label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows="4"
                placeholder="Details on how it was fixed..."
              />
            </div>

            <button 
              onClick={handleUpdate} 
              className="btn" 
              style={{ width: '100%' }}
              disabled={updating}
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
