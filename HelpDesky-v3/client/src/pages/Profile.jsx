import React, { useEffect, useState } from 'react';
import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import { getWorkStatusMeta, PROFILE_STATUS_OPTIONS } from '../utils/profileStatus';
import { roleLabel } from '../utils/labels';
import { errorMessage } from '../utils/errors';

const valueOrNotSet = (value) => (value === null || value === undefined || String(value).trim() === ''
  ? <span className="muted">Not set</span>
  : value);

const Availability = () => {
  const { workStatus, updateWorkStatus } = useAuth();
  const [selected, setSelected] = useState(workStatus);
  const [state, setState] = useState({ kind: 'idle', message: '' });

  useEffect(() => {
    setSelected(workStatus);
  }, [workStatus]);

  // Saves on choice: availability is a one-tap decision, not a form.
  const choose = async (value) => {
    if (value === selected) return;
    const previous = selected;
    setSelected(value);
    setState({ kind: 'saving', message: 'Saving…' });
    try {
      const saved = await updateWorkStatus(value);
      setState({ kind: 'saved', message: `Saved. You're now ${getWorkStatusMeta(saved).label.toLowerCase()}.` });
    } catch (err) {
      setSelected(previous);
      setState({ kind: 'error', message: errorMessage(err, "Couldn't change your availability. Try again.") });
    }
  };

  return (
    <section className="card profile-section" aria-labelledby="availability-heading">
      <div className="profile-section-head">
        <h2 id="availability-heading">Your availability</h2>
        <p className="field-hint">Only available staff can be assigned new tickets.</p>
      </div>
      <fieldset className="availability-options">
        <legend className="visually-hidden">Availability</legend>
        <div className="tile-grid tile-grid-3">
          {PROFILE_STATUS_OPTIONS.map((option) => {
            const checked = selected === option.value;
            return (
              <label key={option.value} className={`tile availability-tile${checked ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="availability"
                  value={option.value}
                  checked={checked}
                  disabled={state.kind === 'saving'}
                  onChange={() => choose(option.value)}
                />
                <span className="tile-label">
                  <span className={`status-dot ${option.toneClass}`} aria-hidden="true" />
                  {option.label}
                </span>
                <span className="tile-hint">{option.description}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <p className={`save-state save-${state.kind}`} aria-live="polite">{state.message}</p>
    </section>
  );
};

const Profile = () => {
  const { user } = useAuth();
  const isEndUser = user?.role === 'END_USER';
  const displayName = user?.name || user?.username;

  const details = [
    ['Full name', user?.name],
    ['Username', user?.username ? `@${user.username}` : null],
    ...(!isEndUser ? [['Role', roleLabel(user?.role)]] : []),
    ['Department', user?.department],
    ['Phone', user?.phone]
  ];

  return (
    <div className={isEndUser ? 'portal-page profile-page' : 'profile-page'}>
      <div className="profile-hero">
        <Avatar name={displayName} size={56} />
        <div>
          <h1 className="page-title">{displayName}</h1>
          <p className="page-lede">{isEndUser ? 'Your account' : roleLabel(user?.role)}</p>
        </div>
      </div>

      {!isEndUser && <Availability />}

      <section className="card profile-section" aria-labelledby="details-heading">
        <div className="profile-section-head">
          <h2 id="details-heading">Account details</h2>
          <p className="field-hint">{isEndUser ? 'Ask IT if anything here is wrong.' : 'Ask an admin to change these.'}</p>
        </div>
        <dl className="detail-list">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{valueOrNotSet(value)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
};

export default Profile;
