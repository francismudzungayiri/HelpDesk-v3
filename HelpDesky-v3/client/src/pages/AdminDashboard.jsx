import React, { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/stats');
      setStats(res.data);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;
  if (!stats) return <div>Error loading stats</div>;

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Admin Dashboard</h2>
      
      {/* Stats Cards Row 1 */}
      <div className="flex gap-2" style={{ marginBottom: '20px' }}>
        <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#6b778c' }}>Total Open Tickets</h4>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#DE350B' }}>{stats.total_open}</div>
        </div>
        
         <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#6b778c' }}>Total Users</h4>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0052cc' }}>{stats.total_users}</div>
        </div>

         <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#6b778c' }}>System Status</h4>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00875A' }}>Operational</div>
        </div>
      </div>

      {/* Stats Cards Row 2 - New Metrics */}
      <div className="flex gap-2" style={{ marginBottom: '30px' }}>
        <div className="card" style={{ flex: 1, textAlign: 'center', borderTop: '4px solid #667eea' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#6b778c' }}>Total Queries (All Time)</h4>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#172B4D' }}>{stats.total_tickets}</div>
        </div>

        <div className="card" style={{ flex: 1, textAlign: 'center', borderTop: '4px solid #10b981' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#6b778c' }}>Today's Queries</h4>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#10b981' }}>{stats.today_tickets}</div>
          <div style={{ fontSize: '12px', color: '#6b778c', marginTop: '5px' }}>{new Date().toLocaleDateString()}</div>
        </div>

        {/* Placeholder to maintain 3-column layout grid if needed */}
        <div style={{ flex: 1 }}></div>
      </div>

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
  );
};

export default AdminDashboard;
