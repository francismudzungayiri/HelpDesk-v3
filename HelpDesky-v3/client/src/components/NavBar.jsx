import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NavBar = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav style={{ background: '#fff', borderBottom: '1px solid #dfe1e6', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Link to="/" style={{ fontWeight: 'bold', fontSize: '18px', color: '#0052cc' }}>HelpDesky</Link>
        <Link to="/" style={{ color: '#42526e' }}>Tickets</Link>
        <Link to="/tickets/new" style={{ color: '#42526e' }}>Create Ticket</Link>
        {user.role === 'ADMIN' && <Link to="/admin" style={{ color: '#42526e' }}>Admin</Link>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span style={{ color: '#6b778c' }}>{user.name}</span>
        <button onClick={logout} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>Logout</button>
      </div>
    </nav>
  );
};

export default NavBar;
