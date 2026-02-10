import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NavBar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const linkStyle = (path) => ({
    display: 'block',
    padding: '10px 15px',
    color: location.pathname === path ? '#0052cc' : '#42526e',
    backgroundColor: location.pathname === path ? '#e6effc' : 'transparent',
    borderRadius: '3px',
    marginBottom: '5px',
    fontWeight: location.pathname === path ? '500' : 'normal',
    textDecoration: 'none'
  });

  return (
    <nav style={{ 
      width: '240px', 
      height: '100vh', 
      background: '#fff', 
      borderRight: '1px solid #dfe1e6', 
      padding: '20px', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0
    }}>
      <div style={{ marginBottom: '30px', padding: '0 10px' }}>
        <Link to="/" style={{ fontWeight: 'bold', fontSize: '20px', color: '#0052cc', textDecoration: 'none' }}>
          HelpDesky
        </Link>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: '10px', textTransform: 'uppercase', fontSize: '11px', color: '#6b778c', fontWeight: 'bold', padding: '0 10px' }}>
          Menu
        </div>
        <Link to="/" style={linkStyle('/')}>All Tickets</Link>
        <Link to="/tickets/new" style={linkStyle('/tickets/new')}>Create Ticket</Link>
        
        {user.role === 'ADMIN' && (
          <div style={{ marginTop: '20px' }}>
             <div style={{ marginBottom: '10px', textTransform: 'uppercase', fontSize: '11px', color: '#6b778c', fontWeight: 'bold', padding: '0 10px' }}>
              Admin
            </div>
            <Link to="/admin" style={linkStyle('/admin')}>Dashboard</Link>
            <Link to="/users" style={linkStyle('/users')}>Users</Link>
            <Link to="/reports" style={linkStyle('/reports')}>Reports</Link>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #dfe1e6', paddingTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', padding: '0 10px' }}>
          <div style={{ width: '32px', height: '32px', background: '#0052cc', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {user.name ? user.name.charAt(0) : user.username.charAt(0)}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: '500', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name || user.username}</div>
            <div style={{ fontSize: '12px', color: '#6b778c' }}>{user.role}</div>
          </div>
        </div>
        <button 
          onClick={logout} 
          className="btn-secondary" 
          style={{ width: '100%', textAlign: 'center' }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default NavBar;
