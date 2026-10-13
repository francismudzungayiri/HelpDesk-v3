import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import AuthCard, { LabelField } from '../components/AuthCard';
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

  const describedBy = (id, key, hasHint = false) => (errors[key] ? `${id}-error` : hasHint ? `${id}-hint` : undefined);

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

  return (
    <AuthCard
      wide
      title="Create your HelpDesky account"
      lede="So you can report IT problems and follow them. Staff accounts are set up by an IT admin."
      footer={<p>Already have an account? <Link to="/login">Sign in</Link></p>}
    >
      <form className="label-form" onSubmit={handleSubmit} noValidate>
        <div className="label-grid label-grid-2">
          <LabelField id="reg-name" label="Full name" error={errors.name}>
            <input id="reg-name" type="text" value={form.name} onChange={setField('name')} autoComplete="name" autoFocus aria-invalid={errors.name ? true : undefined} aria-describedby={describedBy('reg-name', 'name')} />
          </LabelField>
          <LabelField id="reg-department" label="Department" error={errors.department}>
            <input id="reg-department" type="text" value={form.department} onChange={setField('department')} autoComplete="organization-title" aria-invalid={errors.department ? true : undefined} aria-describedby={describedBy('reg-department', 'department')} />
          </LabelField>
          <LabelField id="reg-username" label="Username" error={errors.username} hint="You'll use this to sign in.">
            <input id="reg-username" type="text" value={form.username} onChange={setField('username')} autoComplete="username" autoCapitalize="none" spellCheck={false} aria-invalid={errors.username ? true : undefined} aria-describedby={describedBy('reg-username', 'username', true)} />
          </LabelField>
          <LabelField id="reg-phone" label="Phone (optional)" hint="So IT can call you back.">
            <input id="reg-phone" type="tel" value={form.phone} onChange={setField('phone')} autoComplete="tel" aria-describedby="reg-phone-hint" />
          </LabelField>
          <LabelField id="reg-password" label="Password" error={errors.password} hint="At least 6 characters.">
            <input id="reg-password" type="password" value={form.password} onChange={setField('password')} autoComplete="new-password" aria-invalid={errors.password ? true : undefined} aria-describedby={describedBy('reg-password', 'password', true)} />
          </LabelField>
          <LabelField id="reg-confirmPassword" label="Confirm password" error={errors.confirmPassword}>
            <input id="reg-confirmPassword" type="password" value={form.confirmPassword} onChange={setField('confirmPassword')} autoComplete="new-password" aria-invalid={errors.confirmPassword ? true : undefined} aria-describedby={describedBy('reg-confirmPassword', 'confirmPassword')} />
          </LabelField>
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
