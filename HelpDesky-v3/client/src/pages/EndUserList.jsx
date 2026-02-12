import React, { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const EndUserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    role: 'END_USER',
    password: '',
    department: '',
    phone: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users/end-users');
      setUsers(res.data);
    } catch {
      toast.error('Failed to load end users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this end user?')) return;
    const loadId = toast.loading('Deleting user...');
    try {
      await api.delete(`/users/${id}`);
      toast.success('End user deleted', { id: loadId });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user', { id: loadId });
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ 
      username: '', 
      name: '', 
      role: 'END_USER', 
      password: '',
      department: '',
      phone: ''
    });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({ 
      username: user.username, 
      name: user.name, 
      role: user.role, 
      password: '',
      department: user.department || '',
      phone: user.phone || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const loadId = toast.loading(editingUser ? 'Updating end user...' : 'Creating end user...');
    try {
      if (editingUser) {
        // Edit Mode
        const updates = {};
        if (formData.name !== editingUser.name) updates.name = formData.name;
        if (formData.password) updates.password = formData.password;
        if (formData.department !== editingUser.department) updates.department = formData.department;
        if (formData.phone !== editingUser.phone) updates.phone = formData.phone;

        if (Object.keys(updates).length > 0) {
          await api.patch(`/users/${editingUser.id}`, updates);
          toast.success('End user updated', { id: loadId });
        } else {
          toast.dismiss(loadId);
        }
      } else {
        // Create Mode
        await api.post('/users', formData);
        toast.success('End user created', { id: loadId });
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

  if (loading) return <div>Loading end users...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>End User Management</h2>
        <button onClick={openAddModal} className="btn">Add New End User</button>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Department</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: '500' }}>{u.name}</td>
                  <td style={{ color: '#6b778c' }}>{u.username}</td>
                  <td>{u.department || '-'}</td>
                  <td>{u.phone || '-'}</td>
                  <td>
                    <button
                      onClick={() => openEditModal(u)}
                      className="btn-secondary"
                      style={{ marginRight: '10px', fontSize: '12px', padding: '4px 8px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      style={{ background: 'none', border: 'none', color: '#DE350B', fontSize: '12px', textDecoration: 'underline' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="card modal-card" style={{ width: 'min(450px, 100%)' }}>
            <h3 style={{ marginTop: 0 }}>{editingUser ? 'Edit End User' : 'Add New End User'}</h3>
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
                <label>Username (used for login)</label>
                <input 
                  type="text" 
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  required
                  disabled={!!editingUser}
                  style={editingUser ? { background: '#f4f5f7', color: '#6b778c' } : {}}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <input 
                    type="text" 
                    value={formData.department}
                    onChange={e => setFormData({...formData, department: e.target.value})}
                    placeholder="e.g. Sales"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="e.g. 555-0123"
                  />
                </div>
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
                  {submitting ? 'Saving...' : 'Save End User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EndUserList;
