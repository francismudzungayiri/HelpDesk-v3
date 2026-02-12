import React, { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    role: 'AGENT',
    password: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users/staff');
      setUsers(res.data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    const loadId = toast.loading('Deleting user...');
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted', { id: loadId });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user', { id: loadId });
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ username: '', name: '', role: 'AGENT', password: '' });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({ 
      username: user.username, 
      name: user.name, 
      role: user.role, 
      password: '' 
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const loadId = toast.loading(editingUser ? 'Updating user...' : 'Creating user...');
    try {
      if (editingUser) {
        // Edit Mode
        const updates = {};
        if (formData.name !== editingUser.name) updates.name = formData.name;
        if (formData.role !== editingUser.role) updates.role = formData.role;
        if (formData.password) updates.password = formData.password;

        if (Object.keys(updates).length > 0) {
          await api.patch(`/users/${editingUser.id}`, updates);
          toast.success('User updated', { id: loadId });
        } else {
          toast.dismiss(loadId);
        }
      } else {
        // Create Mode
        await api.post('/users', formData);
        toast.success('User created', { id: loadId });
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      const messages = err.response?.data?.errors || [err.response?.data?.message || 'Operation failed'];
      messages.forEach(msg => toast.error(msg, { id: loadId }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading users...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>User Management</h2>
        <button onClick={openAddModal} className="btn">Add New User</button>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: '500' }}>{u.name}</td>
                  <td style={{ color: '#6b778c' }}>{u.username}</td>
                  <td><span className="badge">{u.role}</span></td>
                  <td>
                    <button
                      onClick={() => openEditModal(u)}
                      className="btn-secondary"
                      style={{ marginRight: '10px', fontSize: '12px', padding: '4px 8px' }}
                    >
                      Edit
                    </button>
                    {u.id !== currentUser.id && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        style={{ background: 'none', border: 'none', color: '#DE350B', fontSize: '12px', textDecoration: 'underline' }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="card modal-card" style={{ width: 'min(400px, 100%)' }}>
            <h3 style={{ marginTop: 0 }}>{editingUser ? 'Edit User' : 'Add New User'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Username</label>
                <input 
                  type="text" 
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  required
                  disabled={!!editingUser}
                  style={editingUser ? { background: '#f4f5f7', color: '#6b778c' } : {}}
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="AGENT">Agent</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label>{editingUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
                <input 
                  type="password" 
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  required={!editingUser}
                  placeholder={editingUser ? '********' : ''}
                />
              </div>

              <div className="form-row" style={{ marginTop: '20px', justifyContent: 'space-between' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" disabled={submitting}>Cancel</button>
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;
