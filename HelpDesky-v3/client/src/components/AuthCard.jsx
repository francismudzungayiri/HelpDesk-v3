import React from 'react';
import LabelField from './LabelField';

const LOGO_SRC = '/helpdesky-logo.png';

// The HelpDesky mark: the logo next to the name, the way a Mac app identifies itself.
export const BrandBlock = ({ size = 'sidebar' }) => (
  <span className={`app-mark app-mark-${size}`}>
    <img className="app-logo" src={LOGO_SRC} alt="" width="30" height="30" />
    <span className="app-name">HelpDesky</span>
  </span>
);

// Shared frame for sign-in and registration: one centred panel, Apple ID style.
const AuthCard = ({ title, lede, children, footer, wide = false }) => (
  <main className="auth-screen">
    <div className={`auth-panel${wide ? ' auth-panel-wide' : ''}`}>
      <img className="app-logo app-logo-large" src={LOGO_SRC} alt="HelpDesky" width="76" height="76" />
      <h1 className="auth-title">{title}</h1>
      {lede && <p className="auth-lede">{lede}</p>}
      {children}
      {footer && <div className="auth-foot">{footer}</div>}
    </div>
  </main>
);

export { LabelField };
export default AuthCard;
