import React, { useEffect, useState } from 'react';
import api from '../api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New User Form State
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    role: 'AGENT'
  });
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/stats'),
        api.get('/users')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      await api.post('/users', newUser);
      alert('User created successfully');
      setNewUser({ username: '', password: '', name: '', role: 'AGENT' });
      fetchData(); // Refresh list
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;
  if (!stats) return <div>Error loading stats</div>;

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Admin Dashboard</h2>
      
      {/* Stats Cards */}
      <div className="flex gap-2" style={{ marginBottom: '30px' }}>
        <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#6b778c' }}>Total Open Tickets</h4>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#DE350B' }}>{stats.total_open}</div>
        </div>
        
         <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#6b778c' }}>System Status</h4>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00875A' }}>Operational</div>
        </div>
      </div>

      <div className="flex gap-2" style={{ alignItems: 'flex-start' }}>
        {/* Left Col: Staff Workload */}
        <div style={{ flex: 1 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Staff Workload</h3>
            <table>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Active Tickets</th>
                  <th>Resolved</th>
                </tr>
              </thead>
              <tbody>
                {stats.staff_stats.map((staff, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: '500' }}>{staff.name}</td>
                    <td>
                       <span className="badge" style={{ background: staff.active_tickets > 0 ? '#fffae6' : '#e3fcef', color: staff.active_tickets > 0 ? '#091e42' : '#006644', fontSize: '14px' }}>
                         {staff.active_tickets}
                       </span>
                    </td>
                    <td>{staff.resolved_tickets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Manage Team */}
        <div style={{ flex: 1 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Manage Team</h3>
            
            {/* List Current Users */}
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px', border: '1px solid #dfe1e6', borderRadius: '4px' }}>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', top: 0, background: '#f4f5f7' }}>Name</th>
                    <th style={{ position: 'sticky', top: 0, background: '#f4f5f7' }}>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>{u.name} <span style={{ color: '#6b778c', fontSize: '12px' }}>({u.username})</span></td>
                      <td><span className="badge">{u.role}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add User Form */}
            <h4 style={{ marginBottom: '10px' }}>Add New Member</h4>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <input 
                  type="text" 
                  placeholder="Full Name"
                  value={newUser.name}
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <input 
                  type="text" 
                  placeholder="Username"
                  value={newUser.username}
                  onChange={e => setNewUser({...newUser, username: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <input 
                  type="password" 
                  placeholder="Password"
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <select 
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="AGENT">Agent</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <button 
                type="submit" 
                className="btn" 
                style={{ width: '100%' }}
                disabled={creatingUser}
              >
                {creatingUser ? 'Creating...' : 'Add Team Member'}
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
