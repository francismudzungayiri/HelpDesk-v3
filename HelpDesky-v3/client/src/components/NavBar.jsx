import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiBarChart2, FiClipboard, FiGrid, FiPlusCircle, FiSettings, FiUser, FiUserCheck, FiUsers } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { getWorkStatusMeta } from '../utils/profileStatus';

const NavBar = () => {
  const { user, logout, workStatus } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const workStatusMeta = getWorkStatusMeta(workStatus);

  const linkStyle = (path) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 15px',
    color: location.pathname === path ? '#0052cc' : '#42526e',
    backgroundColor: location.pathname === path ? '#e6effc' : 'transparent',
    borderRadius: '3px',
    marginBottom: '5px',
    fontWeight: location.pathname === path ? '500' : 'normal',
    textDecoration: 'none'
  });

  const renderNavLink = (path, label, iconComponent) => {
    const IconComponent = iconComponent;
    return (
    <Link to={path} onClick={closeMobileMenu} style={linkStyle(path)}>
      <IconComponent size={16} aria-hidden="true" />
      <span>{label}</span>
    </Link>
    );
  };

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
              {renderNavLink('/portal', 'My Tickets', FiClipboard)}
              {renderNavLink('/tickets/new', 'Submit Ticket', FiPlusCircle)}
              {renderNavLink('/profile', 'Profile', FiUserCheck)}
            </>
          ) : (
            <>
              {renderNavLink('/', 'All Tickets', FiClipboard)}
              {renderNavLink('/tickets/new', 'Create Ticket', FiPlusCircle)}
              {renderNavLink('/profile', 'Profile', FiUserCheck)}

              {(user.role === 'ADMIN' || user.role === 'AGENT') && (
                <div style={{ marginTop: '20px' }}>
                  <div style={{ marginBottom: '10px', textTransform: 'uppercase', fontSize: '11px', color: '#6b778c', fontWeight: 'bold', padding: '0 10px' }}>
                    Management
                  </div>
                  {renderNavLink('/admin', 'Dashboard', FiGrid)}
                  {renderNavLink('/users', 'Staff', FiUsers)}
                  {renderNavLink('/end-users', 'End Users', FiUser)}
                  {user.role === 'ADMIN' && (
                    <>
                      {renderNavLink('/ticket-settings', 'Ticket Settings', FiSettings)}
                      {renderNavLink('/reports', 'Reports', FiBarChart2)}
                    </>
                  )}
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
              <span className={`badge work-status-badge sidebar-work-status ${workStatusMeta.toneClass}`}>
                {workStatusMeta.label}
              </span>
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
