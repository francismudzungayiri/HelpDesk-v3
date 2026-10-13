import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthCard, { LabelField } from '../components/AuthCard';
import { errorMessage } from '../utils/errors';

const Login = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={user.role === 'END_USER' ? '/portal' : '/'} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await login(username.trim(), password);
      navigate(response?.user?.role === 'END_USER' ? '/portal' : '/', { replace: true });
    } catch (err) {
      const status = err.response?.status;
      setError(status === 401 || status === 400
        ? "That username and password don't match. Check them and try again."
        : errorMessage(err, "Couldn't sign you in. Try again."));
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Sign in to HelpDesky"
      lede="Use the username IT gave you, or the one you registered with."
      footer={(
        <p>
          New to HelpDesky? <Link to="/register">Create an account</Link>
        </p>
      )}
    >
      <form className="label-form" onSubmit={handleSubmit} noValidate>
        <div className="label-grid">
          <LabelField id="login-username" label="Username">
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              aria-describedby={error ? 'login-error' : undefined}
            />
          </LabelField>
          <LabelField id="login-password" label="Password">
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              aria-describedby={error ? 'login-error' : undefined}
            />
          </LabelField>
        </div>
        {error && <p className="label-error" id="login-error" role="alert">{error}</p>}
        <button type="submit" className="label-submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthCard>
  );
};

export default Login;
