import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import LabelField from './LabelField';

const LOGO_SRC = '/helpdesky-logo.png';

// The HelpDesky mark: the logo next to the name, the way a Mac app identifies itself.
export const BrandBlock = ({ size = 'sidebar' }) => (
  <span className={`app-mark app-mark-${size}`}>
    <img className="app-logo" src={LOGO_SRC} alt="" width="30" height="30" />
    <span className="app-name">HelpDesky</span>
  </span>
);

// A labelled field with a leading icon; password fields get a show/hide toggle.
export const AuthField = ({ id, label, icon, type = 'text', required = false, hint, error, ...inputProps }) => {
  const [visible, setVisible] = useState(false);
  const IconComponent = icon;
  const isPassword = type === 'password';
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`auth-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="auth-required" aria-hidden="true"> *</span>}
      </label>
      <div className="auth-input">
        {IconComponent && <IconComponent className="auth-input-icon" size={17} aria-hidden="true" />}
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            className="auth-reveal"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
          >
            {visible ? <FiEyeOff size={17} aria-hidden="true" /> : <FiEye size={17} aria-hidden="true" />}
          </button>
        )}
      </div>
      {hint && !error && <p className="auth-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="auth-error-text" id={`${id}-error`}>{error}</p>}
    </div>
  );
};

const Showcase = () => (
  <aside className="auth-showcase" aria-label="About HelpDesky">
    <div className="showcase-stack" aria-hidden="true">
      <img className="shot shot-queue" src="/auth/queue.jpg" alt="" width="1400" height="515" />
      <img className="shot shot-ticket" src="/auth/ticket.jpg" alt="" width="1000" height="632" />
      <img className="shot shot-workload" src="/auth/workload.jpg" alt="" width="1100" height="291" />
    </div>
    <div className="showcase-copy">
      <span className="showcase-logo"><img src={LOGO_SRC} alt="" width="56" height="56" /></span>
      <h2>Every IT problem, from <span>reported</span> to <span>resolved</span></h2>
      <p>Report a problem in your own words, see who is working on it, and follow it until it's fixed. IT routes every ticket to the right person.</p>
    </div>
  </aside>
);

// Split sign-in / sign-up screen: the form on the left, HelpDesky itself on the right.
const AuthCard = ({ mode = 'signin', title, lede, children }) => (
  <main className="auth-split">
    <section className="auth-form-side">
      <header className="auth-brand">
        <BrandBlock size="bar" />
      </header>
      <div className={`auth-form-wrap${mode === 'signup' ? ' is-wide' : ''}`}>
        <h1 className="auth-title">{title}</h1>
        {lede && <p className="auth-lede">{lede}</p>}
        <nav className="auth-switch" aria-label="Sign in or create an account">
          <Link to="/login" className={mode === 'signin' ? 'is-active' : ''} aria-current={mode === 'signin' ? 'page' : undefined}>Sign in</Link>
          <Link to="/register" className={mode === 'signup' ? 'is-active' : ''} aria-current={mode === 'signup' ? 'page' : undefined}>Sign up</Link>
        </nav>
        {children}
      </div>
    </section>
    <Showcase />
  </main>
);

export { LabelField };
export default AuthCard;
