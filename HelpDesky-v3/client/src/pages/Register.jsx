import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { FiAtSign, FiBriefcase, FiLock, FiPhone, FiUser } from 'react-icons/fi';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import AuthCard, { AuthField } from '../components/AuthCard';
import { errorMessage } from '../utils/errors';

const EMPTY = { name: '', department: '', username: '', phone: '', password: '', confirmPassword: '' };

const validate = (form) => {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = 'Enter your full name.';
  if (!form.department.trim()) errors.department = 'Enter your department, e.g. Finance.';
  if (form.username.trim().length < 3) errors.username = 'Use at least 3 characters.';
  if (form.password.length < 6) errors.password = 'Use at least 6 characters.';
  if (!errors.password && form.confirmPassword !== form.password) errors.confirmPassword = "This doesn't match the password above.";
  return errors;
};

const Register = () => {
  const navigate = useNavigate();
  const { setSession, user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={user.role === 'END_USER' ? '/portal' : '/'} replace />;

  const setField = (key) => (event) => {
    setForm({ ...form, [key]: event.target.value });
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  };


  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setFormError('');
    const firstKey = Object.keys(nextErrors)[0];
    if (firstKey) {
      document.getElementById(`reg-${firstKey}`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/auth/register', {
        username: form.username.trim(),
        password: form.password,
        name: form.name.trim(),
        department: form.department.trim(),
        phone: form.phone.trim()
      });
      setSession(response.data.token, response.data.user);
      navigate('/portal', { replace: true });
    } catch (err) {
      setFormError(errorMessage(err, "Couldn't create your account. Try again."));
      setSubmitting(false);
    }
  };

  const field = (key, label, icon, extra = {}) => (
    <AuthField
      id={`reg-${key}`}
      label={label}
      icon={icon}
      value={form[key]}
      onChange={setField(key)}
      error={errors[key]}
      {...extra}
    />
  );

  return (
    <AuthCard
      mode="signup"
      title="Create your account"
      lede="So you can report IT problems and follow them. Staff accounts are set up by an IT admin."
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-grid">
          {field('name', 'Full name', FiUser, { required: true, autoComplete: 'name', autoFocus: true, placeholder: 'e.g. Rudo Moyo', maxLength: 120 })}
          {field('department', 'Department', FiBriefcase, { required: true, autoComplete: 'organization-title', placeholder: 'e.g. Finance', maxLength: 120 })}
          {field('username', 'Username', FiAtSign, { required: true, autoComplete: 'username', autoCapitalize: 'none', spellCheck: false, maxLength: 50, hint: "You'll use this to sign in." })}
          {field('phone', 'Phone (optional)', FiPhone, { type: 'tel', autoComplete: 'tel', maxLength: 40, hint: 'So IT can call you back.' })}
          {field('password', 'Password', FiLock, { type: 'password', required: true, autoComplete: 'new-password', hint: 'At least 6 characters.' })}
          {field('confirmPassword', 'Confirm password', FiLock, { type: 'password', required: true, autoComplete: 'new-password' })}
        </div>
        {formError && <p className="label-error" role="alert">{formError}</p>}
        <button type="submit" className="label-submit" disabled={submitting}>
          {submitting ? 'Creating your account…' : 'Create account'}
        </button>
      </form>
    </AuthCard>
  );
};

export default Register;
