import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import Avatar from '../components/Avatar';
import { timeAgo } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEndUser = user?.role === 'END_USER';

  const [ticket, setTicket] = useState(null);
  const [users, setUsers] = useState([]);
  const [notes, setNotes] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [status, setStatus] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');

  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const ticketRes = await api.get(`/tickets/${id}`);
      setTicket(ticketRes.data);
      setStatus(ticketRes.data.status);
      setAssigneeId(ticketRes.data.assignee_id || '');
      setResolutionNote(ticketRes.data.resolution_note || '');

      if (!isEndUser) {
        const [usersRes, notesRes, historyRes] = await Promise.all([
          api.get('/users/staff'),
          api.get(`/tickets/${id}/notes`),
          api.get(`/tickets/${id}/history`)
        ]);
        setUsers(usersRes.data);
        setNotes(notesRes.data);
        setHistory(historyRes.data);
      } else {
        setUsers([]);
        setNotes([]);
        setHistory([]);
      }
    } catch (err) {
      console.error('Error fetching ticket detail:', err);
      toast.error(err.response?.data?.message || 'Failed to load ticket details');
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [id, isEndUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdate = async () => {
    if (isEndUser) return;

    setUpdating(true);
    try {
      await api.patch(`/tickets/${id}`, {
        status,
        assignee_id: assigneeId ? parseInt(assigneeId, 10) : null,
        resolution_note: resolutionNote
      });
      toast.success('Ticket updated successfully');
      fetchData();
    } catch (err) {
      const messages = err.response?.data?.errors || [err.response?.data?.message || 'Failed to update ticket'];
      messages.forEach((msg) => toast.error(msg));
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (isEndUser || !newNote.trim()) return;

    setAddingNote(true);
    try {
      await api.post(`/tickets/${id}/notes`, { note: newNote });
      toast.success('Note added');
      setNewNote('');
      const res = await api.get(`/tickets/${id}/notes`);
      setNotes(res.data);
    } catch (err) {
      const messages = err.response?.data?.errors || [err.response?.data?.message || 'Failed to add note'];
      messages.forEach((msg) => toast.error(msg));
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) return <div>Loading details...</div>;
  if (!ticket) return <div>Ticket not found</div>;

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => navigate(isEndUser ? '/portal' : '/')} className="btn-secondary">← Back</button>
      </div>

      <div className="flex gap-2" style={{ alignItems: 'flex-start' }}>
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

          {!isEndUser && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3 style={{ marginTop: 0 }}>Internal Notes & Work Log</h3>

              <div style={{ marginBottom: '20px' }}>
                {notes.length === 0 && <div style={{ color: '#6b778c', fontStyle: 'italic' }}>No notes yet.</div>}
                {notes.map((note) => (
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

              <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '10px' }}>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add an internal note or documentation..."
                  rows="2"
                  style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #dfe1e6' }}
                />
                <button
                  type="submit"
                  className="btn-secondary"
                  disabled={addingNote || !newNote.trim()}
                  style={{ height: 'fit-content' }}
                >
                  Add Note
                </button>
              </form>
            </div>
          )}

          {!isEndUser && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Ticket Activities</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {history.length === 0 && <div style={{ color: '#6b778c', fontStyle: 'italic' }}>No activities recorded yet.</div>}
                {history.map((item) => (
                  <div key={item.id} style={{ display: 'flex', gap: '15px', paddingBottom: '15px', borderBottom: '1px solid #f4f5f7' }}>
                    <div style={{ minWidth: '100px', fontSize: '12px', color: '#6b778c' }}>{timeAgo(item.created_at)}</div>
                    <div style={{ flex: 1, fontSize: '14px' }}>
                      <strong>{item.user_name}</strong>
                      {item.action === 'STATUS_CHANGE' && (
                        <span> changed status from <span className="badge" style={{ background: '#ebecf0', color: '#42526e' }}>{item.old_value}</span> to <span className="badge" style={{ background: '#e3f2fd', color: '#1976d2' }}>{item.new_value}</span></span>
                      )}
                      {item.action === 'ASSIGNEE_CHANGE' && (
                        <span>
                          {item.new_value === 'null'
                            ? ` unassigned the ticket (previously ${item.old_name || 'unassigned'})`
                            : ` assigned the ticket to ${item.new_name || 'unknown user'}`}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Actions</h3>

            {!isEndUser && (
              <>
                <div className="form-group">
                  <label>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ fontWeight: '500' }}>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Assignee</label>
                  <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                    <option value="">Unassigned</option>
                    {users.map((u) => (
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

                <button onClick={handleUpdate} className="btn" style={{ width: '100%' }} disabled={updating}>
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}

            {isEndUser && (
              <div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#6b778c' }}>Current Status</label>
                  <div style={{ padding: '10px', background: '#f4f5f7', borderRadius: '4px', fontWeight: '500' }}>
                    {status.replace('_', ' ')}
                  </div>
                </div>
                {ticket.assignee_name && (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#6b778c' }}>Assigned To</label>
                    <div style={{ padding: '10px', background: '#f4f5f7', borderRadius: '4px' }}>
                      {ticket.assignee_name}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
