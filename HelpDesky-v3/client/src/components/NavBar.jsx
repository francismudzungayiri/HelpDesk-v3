import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NavBar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const closeMobileMenu = () => setMobileMenuOpen(false);

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
    <nav className={`app-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand-row">
        <Link
          to={user.role === 'END_USER' ? '/portal' : '/'}
          onClick={closeMobileMenu}
          style={{ fontWeight: 'bold', fontSize: '20px', color: '#0052cc', textDecoration: 'none' }}
        >
          HelpDesky
        </Link>

        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen((previous) => !previous)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      <div className="sidebar-body">
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '10px', textTransform: 'uppercase', fontSize: '11px', color: '#6b778c', fontWeight: 'bold', padding: '0 10px' }}>
            Menu
          </div>

          {user.role === 'END_USER' ? (
            <>
              <Link to="/portal" onClick={closeMobileMenu} style={linkStyle('/portal')}>My Tickets</Link>
              <Link to="/tickets/new" onClick={closeMobileMenu} style={linkStyle('/tickets/new')}>Submit Ticket</Link>
            </>
          ) : (
            <>
              <Link to="/" onClick={closeMobileMenu} style={linkStyle('/')}>All Tickets</Link>
              <Link to="/tickets/new" onClick={closeMobileMenu} style={linkStyle('/tickets/new')}>Create Ticket</Link>

              {user.role === 'ADMIN' && (
                <div style={{ marginTop: '20px' }}>
                  <div style={{ marginBottom: '10px', textTransform: 'uppercase', fontSize: '11px', color: '#6b778c', fontWeight: 'bold', padding: '0 10px' }}>
                    Admin
                  </div>
                  <Link to="/admin" onClick={closeMobileMenu} style={linkStyle('/admin')}>Dashboard</Link>
                  <Link to="/users" onClick={closeMobileMenu} style={linkStyle('/users')}>Staff</Link>
                  <Link to="/end-users" onClick={closeMobileMenu} style={linkStyle('/end-users')}>End Users</Link>
                  <Link to="/ticket-settings" onClick={closeMobileMenu} style={linkStyle('/ticket-settings')}>Ticket Settings</Link>
                  <Link to="/reports" onClick={closeMobileMenu} style={linkStyle('/reports')}>Reports</Link>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ borderTop: '1px solid #dfe1e6', paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', padding: '0 10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                background: '#0052cc',
                borderRadius: '50%',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}
            >
              {user.name ? user.name.charAt(0) : user.username.charAt(0)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: '500', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name || user.username}
              </div>
              <div style={{ fontSize: '12px', color: '#6b778c' }}>{user.role}</div>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="btn-secondary"
            style={{ width: '100%', textAlign: 'center' }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
