import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { FiLock, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import AuthCard, { AuthField } from '../components/AuthCard';
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
      mode="signin"
      title="Welcome to HelpDesky"
      lede="Sign in to report a problem or work on tickets. Use the username IT gave you, or the one you registered with."
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <AuthField
          id="login-username"
          label="Username"
          icon={FiUser}
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
        />
        <AuthField
          id="login-password"
          label="Password"
          icon={FiLock}
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
        />
        {error && <p className="label-error" role="alert">{error}</p>}
        <button type="submit" className="label-submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthCard>
  );
};

export default Login;
