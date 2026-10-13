import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { BrandBlock } from './AuthCard';

const PortalBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const displayName = user.name || user.username;

  return (
    <header className="portal-bar">
      <div className="portal-bar-inner">
        <Link to="/portal" className="portal-wordmark" aria-label="HelpDesky, your tickets">
          <BrandBlock size="bar" />
        </Link>

        <nav className="portal-bar-nav" aria-label="Main">
          <NavLink to="/portal" end className="portal-bar-link">My tickets</NavLink>
          <NavLink to="/profile" className="portal-bar-link portal-bar-person" aria-label={`Your profile (${displayName})`}>
            <span className="portal-bar-name">{displayName}</span>
            <span className="portal-bar-name-short" aria-hidden="true">Profile</span>
          </NavLink>
          <button
            type="button"
            className="portal-bar-link portal-bar-logout"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
          >
            <FiLogOut size={16} aria-hidden="true" />
            <span>Log out</span>
          </button>
        </nav>
      </div>
    </header>
  );
};

export default PortalBar;
