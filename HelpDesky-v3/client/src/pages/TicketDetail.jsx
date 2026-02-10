import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import Avatar from '../components/Avatar';
import { timeAgo } from '../utils/dateUtils';

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [users, setUsers] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Form State for "Edit" actions
  const [status, setStatus] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  
  // Note Form
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // 1. Fetch Ticket (Critical)
      const ticketRes = await api.get(`/tickets/${id}`);
      setTicket(ticketRes.data);
      
      // Init form state
      setStatus(ticketRes.data.status);
      setAssigneeId(ticketRes.data.assignee_id || '');
      setResolutionNote(ticketRes.data.resolution_note || '');

      // 2. Fetch Users (Critical for assignment, but maybe opt?)
      try {
        const usersRes = await api.get('/users');
        setUsers(usersRes.data);
      } catch (e) {
        console.error('Failed to load users', e);
      }

      // 3. Fetch Notes (Non-critical)
      try {
        const notesRes = await api.get(`/tickets/${id}/notes`);
        setNotes(notesRes.data);
      } catch (e) {
        console.error('Failed to load notes', e);
      }

    } catch (err) {
      console.error('Error fetching ticket', err);
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

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await api.post(`/tickets/${id}/notes`, { note: newNote });
      setNewNote('');
      // Refresh notes only (opt) or full data
      const res = await api.get(`/tickets/${id}/notes`);
      setNotes(res.data);
    } catch (err) {
      console.error('Failed to add note:', err.response?.data || err.message);
      alert(`Failed to add note: ${err.response?.data?.message || err.message}`);
    } finally {
      setAddingNote(false);
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
        {/* Left Column: Ticket Info & Notes */}
        <div style={{ flex: 2 }}>
          <div className="card" style={{ marginBottom: '20px' }}>
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

          {/* Documentation / Activity / Notes */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Internal Notes & Work Log</h3>
            
            <div style={{ marginBottom: '20px' }}>
              {notes.length === 0 && <div style={{ color: '#6b778c', fontStyle: 'italic' }}>No notes yet.</div>}
              {notes.map(note => (
                <div key={note.id} style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                  <Avatar name={note.user_name} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{note.user_name}</span>
                      <span style={{ color: '#6b778c', fontSize: '12px' }}>{timeAgo(note.created_at)}</span>
                    </div>
                    <div style={{ background: '#f4f5f7', padding: '10px', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                      {note.note}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <textarea 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add an internal note or documentation..."
                rows="2"
                style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #dfe1e6' }}
              />
              <button 
                onClick={handleAddNote} 
                className="btn-secondary"
                disabled={addingNote || !newNote.trim()}
                style={{ height: 'fit-content' }}
              >
                {addingNote ? 'Add Note' : 'Add Note'}
              </button>
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
              <label>Final Resolution</label>
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
