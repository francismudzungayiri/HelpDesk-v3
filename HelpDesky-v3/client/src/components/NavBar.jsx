import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiBarChart2, FiClipboard, FiGrid, FiLogOut, FiPlusCircle, FiSettings, FiUser, FiUserCheck, FiUsers } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getWorkStatusMeta, PROFILE_STATUS_OPTIONS } from '../utils/profileStatus';
import { roleLabel } from '../utils/labels';
import { errorMessage } from '../utils/errors';
import Avatar from './Avatar';
import { BrandBlock } from './AuthCard';

const NavBar = () => {
  const { user, logout, workStatus, updateWorkStatus } = useAuth();
  const [statusSaving, setStatusSaving] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const workStatusMeta = getWorkStatusMeta(workStatus);

  // A ticket page belongs to the Tickets section; "Create ticket" has its own link.
  const isActive = (path) => location.pathname === path
    || (path === '/' && location.pathname.startsWith('/tickets/') && location.pathname !== '/tickets/new');

  const changeStatus = async (event) => {
    setStatusSaving(true);
    try {
      const saved = await updateWorkStatus(event.target.value);
      toast.success(`You're now ${getWorkStatusMeta(saved).label.toLowerCase()}`);
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't change your availability. Try again."));
    } finally {
      setStatusSaving(false);
    }
  };

  const navItem = (to, label, iconComponent) => {
    const IconComponent = iconComponent;
    return (
      <Link
        key={to}
        to={to}
        onClick={closeMobileMenu}
        className={`rail-link${isActive(to) ? ' is-active' : ''}`}
        aria-current={isActive(to) ? 'page' : undefined}
      >
        <IconComponent size={16} aria-hidden="true" />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <nav className={`app-sidebar rail${mobileMenuOpen ? ' mobile-open' : ''}`} aria-label="Main">
      <div className="sidebar-brand-row">
        <Link to="/" onClick={closeMobileMenu} className="rail-brand" aria-label="HelpDesky, go to tickets">
          <BrandBlock size="sidebar" />
        </Link>
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-expanded={mobileMenuOpen}
          aria-controls="rail-body"
        >
          {mobileMenuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      <div className="sidebar-body" id="rail-body">
        <div className="rail-sections">
          <div className="rail-section">
            <p className="rail-caption">Work</p>
            {navItem('/', 'Tickets', FiClipboard)}
            {navItem('/tickets/new', 'Create ticket', FiPlusCircle)}
            {navItem('/admin', 'Dashboard', FiGrid)}
          </div>
          <div className="rail-section">
            <p className="rail-caption">People</p>
            {navItem('/users', 'Staff', FiUsers)}
            {navItem('/end-users', 'End users', FiUser)}
          </div>
          {user.role === 'ADMIN' && (
            <div className="rail-section">
              <p className="rail-caption">Admin</p>
              {navItem('/ticket-settings', 'Ticket settings', FiSettings)}
              {navItem('/reports', 'Reports', FiBarChart2)}
            </div>
          )}
        </div>

        <div className="rail-user">
          <Link to="/profile" onClick={closeMobileMenu} className={`rail-person${isActive('/profile') ? ' is-active' : ''}`} aria-current={isActive('/profile') ? 'page' : undefined}>
            <Avatar name={user.name || user.username} size={32} />
            <span className="rail-person-text">
              <span className="rail-person-name">{user.name || user.username}</span>
              <span className="rail-person-role">{roleLabel(user.role)} · Profile</span>
            </span>
            <FiUserCheck size={14} aria-hidden="true" className="rail-person-icon" />
          </Link>
          <label className={`rail-status ${workStatusMeta.toneClass}`}>
            <span className="visually-hidden">Your availability</span>
            <span className={`status-dot ${workStatusMeta.toneClass}`} aria-hidden="true" />
            <select value={workStatus} onChange={changeStatus} disabled={statusSaving}>
              {PROFILE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="rail-logout"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
          >
            <FiLogOut size={14} aria-hidden="true" />
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
